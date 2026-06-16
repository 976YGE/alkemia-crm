import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportRequest {
  countryCode: string;
  mode?: "full" | "generate_only" | "sftp_only";
  fileName?: string;
}

async function uploadToSFTP(
  host: string,
  port: number,
  username: string,
  password: string,
  remotePath: string,
  fileName: string,
  fileContent: Uint8Array
): Promise<void> {
  const { Client } = await import("npm:ssh2@1.15.0");
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        const remoteFile = `${remotePath}/${fileName}`;
        const writeStream = sftp.createWriteStream(remoteFile);

        writeStream.on("close", () => {
          conn.end();
          resolve();
        });

        writeStream.on("error", (error: Error) => {
          conn.end();
          reject(error);
        });

        writeStream.write(fileContent);
        writeStream.end();
      });
    });

    conn.on("error", (error: Error) => {
      reject(error);
    });

    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 30000,
      keepaliveInterval: 5000,
    });
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    if (!isServiceRole) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
        throw new Error("Insufficient permissions");
      }
    }

    const { countryCode, mode = "full", fileName: requestedFileName }: ExportRequest = await req.json();

    if (!countryCode) {
      return new Response(
        JSON.stringify({ success: false, message: "Country code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: sftpConfig, error: sftpConfigError } = await supabase
      .from("sftp_configurations")
      .select("*")
      .eq("country_code", countryCode)
      .eq("active", true)
      .maybeSingle();

    if (sftpConfigError) {
      throw sftpConfigError;
    }

    if (mode === "sftp_only") {
      if (!sftpConfig) {
        throw new Error("No active SFTP configuration found for this country");
      }

      const { data: unsentFiles, error: unsentError } = await supabase
        .from("sftp_file_logs")
        .select("id, filename")
        .eq("operation_type", "export")
        .eq("file_type", "sales_csv")
        .eq("status", "success")
        .eq("sftp_sent", false)
        .ilike("filename", `sales-%`)
        .order("created_at", { ascending: true });

      if (unsentError) {
        throw unsentError;
      }

      const filesToSend = unsentFiles || [];

      const storagePrefix = countryCode;
      const relevantFiles = [];
      for (const f of filesToSend) {
        const { data: fileData } = await supabase.storage
          .from("sales-exports")
          .download(`${storagePrefix}/${f.filename}`);
        if (fileData) {
          relevantFiles.push({ ...f, fileData });
        }
      }

      if (relevantFiles.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Aucun fichier CSV en attente d'envoi SFTP",
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const password = atob(sftpConfig.password_encrypted);
      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const file of relevantFiles) {
        const csvBuffer = new Uint8Array(await file.fileData.arrayBuffer());
        try {
          await uploadToSFTP(
            sftpConfig.host,
            sftpConfig.port,
            sftpConfig.username,
            password,
            sftpConfig.export_path,
            file.filename,
            csvBuffer
          );

          await supabase
            .from("sftp_file_logs")
            .update({ sftp_sent: true, sftp_sent_at: new Date().toISOString() })
            .eq("id", file.id);

          await supabase
            .from("sftp_connection_logs")
            .insert({
              sftp_config_id: sftpConfig.id,
              connection_type: "export",
              status: "success",
              file_name: file.filename,
              records_count: 0,
              file_size_bytes: csvBuffer.length,
              details: { fileName: file.filename, mode: "sftp_only", fileSize: csvBuffer.length },
            });

          sentCount++;
        } catch (sftpError) {
          failedCount++;
          const errMsg = sftpError instanceof Error ? sftpError.message : "SFTP upload failed";
          errors.push(`${file.filename}: ${errMsg}`);

          await supabase
            .from("sftp_connection_logs")
            .insert({
              sftp_config_id: sftpConfig.id,
              connection_type: "export",
              status: "failed",
              file_name: file.filename,
              error_message: errMsg,
              details: { fileName: file.filename, mode: "sftp_only", error: String(sftpError) },
            });
        }
      }

      const allSuccess = failedCount === 0;
      let message: string;
      if (allSuccess) {
        message = `${sentCount} fichier(s) envoyé(s) vers le SFTP avec succès`;
      } else if (sentCount > 0) {
        message = `${sentCount} fichier(s) envoyé(s), ${failedCount} échec(s)`;
      } else {
        message = `Échec de l'envoi des ${failedCount} fichier(s) vers le SFTP`;
      }

      return new Response(
        JSON.stringify({
          success: allSuccess || sentCount > 0,
          message,
          sentCount,
          failedCount,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { status: allSuccess || sentCount > 0 ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: reports, error: reportsError } = await supabase
      .from("sales_reports")
      .select(`
        id,
        user_id,
        appointment_id,
        total_amount,
        comment,
        proof_file_path,
        appointment:appointments!inner(
          external_id,
          user_code_id,
          appointment_date
        ),
        lines:sales_report_lines(
          id,
          product_id,
          quantity,
          line_amount,
          product:products(code)
        )
      `)
      .eq("country_code", countryCode)
      .eq("status", "validated")
      .eq("exported", false);

    if (reportsError) {
      throw reportsError;
    }

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No reports to export" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userCodes } = await supabase
      .from("user_codes")
      .select("id, code")
      .in("id", reports.map(r => r.appointment?.user_code_id).filter(Boolean));

    const userCodeMap = new Map(userCodes?.map(uc => [uc.id, uc.code]) || []);

    const csvHeader = "id;user_id;event_id;product_id;quantity;ca_tickets;comment;image";
    const encoder = new TextEncoder();
    const startTime = Date.now();

    const generatedFiles: { fileName: string; linesCount: number; fileSize: number }[] = [];
    const exportedReportIds: string[] = [];
    let totalLinesCount = 0;
    let sftpAllSuccess = true;
    let sftpAttempted = false;

    const sftpPassword = (mode === "full" && sftpConfig)
      ? atob(sftpConfig.password_encrypted)
      : null;

    for (const report of reports) {
      if (!report.lines || report.lines.length === 0) continue;

      const userCode = userCodeMap.get(report.appointment?.user_code_id || "") || "";
      const eventId = report.appointment?.external_id || "";
      const comment = (report.comment || "").replace(/;/g, ",").replace(/\n/g, " ");
      const imageFileName = report.proof_file_path
        ? report.proof_file_path.split("/").pop() || ""
        : "";

      const csvLines: string[] = [csvHeader];

      for (const line of report.lines) {
        const productCode = line.product?.code || "";
        csvLines.push(
          `${line.id};${userCode};${eventId};${productCode};${line.quantity};${(Number(report.total_amount) || 0).toFixed(2)};${comment};${imageFileName}`
        );
      }

      const csvContent = csvLines.join("\r\n");
      const csvBuffer = encoder.encode(csvContent);

      const appointmentDate = report.appointment?.appointment_date
        ? report.appointment.appointment_date.substring(0, 10)
        : new Date().toISOString().substring(0, 10);
      const reportEventId = report.appointment?.external_id || countryCode;
      const fileName = `sales-${reportEventId}-${userCode}-${appointmentDate}.csv`;

      const { error: uploadError } = await supabase.storage
        .from("sales-exports")
        .upload(`${countryCode}/${fileName}`, csvBuffer, {
          contentType: "text/csv",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Failed to upload CSV for report ${report.id}:`, uploadError);
        continue;
      }

      const linesCount = csvLines.length - 1;
      totalLinesCount += linesCount;
      generatedFiles.push({ fileName, linesCount, fileSize: csvBuffer.length });

      let fileSftpSent = false;
      let fileSftpFailed = false;

      if (mode === "full" && sftpConfig && sftpPassword) {
        sftpAttempted = true;
        try {
          await uploadToSFTP(
            sftpConfig.host,
            sftpConfig.port,
            sftpConfig.username,
            sftpPassword,
            sftpConfig.export_path,
            fileName,
            csvBuffer
          );

          fileSftpSent = true;

          await supabase
            .from("sftp_connection_logs")
            .insert({
              sftp_config_id: sftpConfig.id,
              connection_type: "export",
              status: "success",
              file_name: fileName,
              records_count: linesCount,
              file_size_bytes: csvBuffer.length,
              details: { fileName, recordsExported: linesCount, fileSize: csvBuffer.length },
            });

          await supabase
            .from("sftp_file_logs")
            .update({ sftp_sent: true, sftp_sent_at: new Date().toISOString() })
            .eq("filename", fileName)
            .eq("operation_type", "export")
            .eq("file_type", "sales_csv")
            .eq("sftp_sent", false);
        } catch (sftpError) {
          sftpAllSuccess = false;
          fileSftpFailed = true;
          await supabase
            .from("sftp_connection_logs")
            .insert({
              sftp_config_id: sftpConfig.id,
              connection_type: "export",
              status: "failed",
              file_name: fileName,
              error_message: sftpError instanceof Error ? sftpError.message : "SFTP upload failed",
              details: { fileName, error: String(sftpError) },
            });
          console.error(`SFTP upload failed for ${fileName}:`, sftpError);
        }
      }

      if (!fileSftpFailed) {
        const { error: updateError } = await supabase
          .from("sales_reports")
          .update({
            exported: true,
            exported_at: new Date().toISOString(),
          })
          .eq("id", report.id);

        if (!updateError) {
          exportedReportIds.push(report.id);
        }
      }

      await supabase
        .from("sftp_file_logs")
        .insert({
          filename: fileName,
          operation_type: "export",
          file_type: "sales_csv",
          status: "success",
          records_processed: linesCount,
          records_failed: 0,
          error_message: null,
          processing_time_ms: Date.now() - startTime,
          file_size_bytes: csvBuffer.length,
          sftp_sent: fileSftpSent,
          sftp_sent_at: fileSftpSent ? new Date().toISOString() : null,
        });
    }

    if (generatedFiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No reports with lines to export" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sftpSuccess = sftpAttempted && sftpAllSuccess;

    let message: string;
    if (mode === "generate_only") {
      message = `${generatedFiles.length} fichier(s) CSV généré(s) avec succès`;
    } else if (sftpSuccess) {
      message = `Export complet réussi : ${generatedFiles.length} fichier(s) CSV + SFTP`;
    } else if (sftpAttempted) {
      message = `${generatedFiles.length} CSV généré(s) mais certains envois SFTP ont échoué`;
    } else {
      message = `${generatedFiles.length} fichier(s) CSV généré(s) avec succès`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        files: generatedFiles.map(f => f.fileName),
        fileName: generatedFiles[generatedFiles.length - 1]?.fileName,
        reportsCount: exportedReportIds.length,
        linesCount: totalLinesCount,
        sftpSent: sftpSuccess,
        mode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Export failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
