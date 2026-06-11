import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 500;

interface ScheduledSyncRequest {
  configId: string;
  triggered_by: "schedule" | "retry";
  parent_operation_id?: string;
  retry_count?: number;
}

interface FileInfo {
  filename: string;
  content: string;
  type: "users" | "products" | "appointments" | "unknown";
}

function determineFileType(
  filename: string
): "users" | "products" | "appointments" | "unknown" {
  const lower = filename.toLowerCase();
  if (lower.includes("user")) return "users";
  if (lower.includes("produit") || lower.includes("product")) return "products";
  if (lower.includes("agenda") || lower.includes("appointment"))
    return "appointments";
  return "unknown";
}

async function batchInsertErrors(supabase: any, logId: string, errorItems: any[]) {
  for (let i = 0; i < errorItems.length; i += BATCH_SIZE) {
    await supabase.from("import_errors").insert(errorItems.slice(i, i + BATCH_SIZE));
  }
}

async function processUsers(supabase: any, content: string, countryCode: string, logId: string) {
  const lines = content.trim().split("\n");
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];
  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    processed++;
    const fields = line.split(";");
    try {
      if (fields.length < 4) throw new Error("Invalid format: not enough fields");
      const code = fields[0].trim();
      const lastName = fields[1].trim();
      const firstName = fields[2].trim();
      const isActive = fields[3].trim() === "1";
      upsertRows.push({
        code,
        first_name: firstName,
        last_name: lastName,
        country_code: countryCode,
        is_active: isActive,
        is_activated: false,
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: (error as Error).message,
        raw_data: { line },
      });
    }
  }

  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("user_codes")
      .upsert(batch, { onConflict: "code,country_code", ignoreDuplicates: false });
    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) await batchInsertErrors(supabase, logId, errorItems);
  return { processed, success, errors };
}

async function processProducts(supabase: any, content: string, countryCode: string, logId: string) {
  const lines = content.trim().split("\n");
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];

  const { data: existingCategories } = await supabase
    .from("product_categories")
    .select("id, code")
    .eq("country_code", countryCode);

  const categoryMap = new Map<string, string>(
    (existingCategories || []).map((c: any) => [c.code, c.id])
  );

  const newCategoryRows: any[] = [];
  const categoryCodesNeeded = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = line.split(";");
    if (fields.length >= 5) {
      const categoryCode = fields[3].trim();
      const categoryName = fields[4].trim();
      if (
        categoryCode &&
        categoryName &&
        !categoryMap.has(categoryCode) &&
        !categoryCodesNeeded.has(categoryCode)
      ) {
        categoryCodesNeeded.add(categoryCode);
        newCategoryRows.push({
          code: categoryCode,
          name: categoryName,
          country_code: countryCode,
        });
      }
    }
  }

  if (newCategoryRows.length > 0) {
    const { data: inserted } = await supabase
      .from("product_categories")
      .insert(newCategoryRows)
      .select("id, code");
    (inserted || []).forEach((c: any) => categoryMap.set(c.code, c.id));
  }

  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    processed++;
    const fields = line.split(";");
    try {
      if (fields.length < 7) throw new Error("Invalid format: not enough fields");
      const code = fields[0].trim();
      const ean = fields[1].trim();
      const name = fields[2].trim();
      const categoryCode = fields[3].trim();
      const price = parseFloat(fields[5].trim());
      const isActive = fields[6].trim() === "1";
      if (!categoryCode) throw new Error("Product must have a category");
      const categoryId = categoryMap.get(categoryCode);
      if (!categoryId) throw new Error(`Category ${categoryCode} not found`);
      upsertRows.push({
        code,
        name,
        ean,
        category_id: categoryId,
        price,
        country_code: countryCode,
        active: isActive,
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: (error as Error).message,
        raw_data: { line },
      });
    }
  }

  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "code,country_code", ignoreDuplicates: false });
    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) await batchInsertErrors(supabase, logId, errorItems);
  return { processed, success, errors };
}

async function upsertCustomersFromAppointments(
  supabase: any,
  rows: any[],
  countryCode: string
): Promise<Map<string, string>> {
  const customerMap = new Map<string, string>();
  const uniqueCustomers = new Map<string, any>();

  for (const row of rows) {
    if (!row.erp_code) continue;
    uniqueCustomers.set(row.erp_code, {
      name: row.store_name,
      country_code: countryCode,
      erp_code: row.erp_code,
      old_crm_code: row.old_crm_code,
      phone: row.phone,
      address: row.store_address,
      city: row.store_city,
      postal_code: row.store_postal_code,
      source: "import",
      type: "client",
    });
  }

  const customerRows = Array.from(uniqueCustomers.values());
  if (customerRows.length === 0) return customerMap;

  for (let i = 0; i < customerRows.length; i += BATCH_SIZE) {
    const batch = customerRows.slice(i, i + BATCH_SIZE);
    await supabase
      .from("customers")
      .upsert(batch, { onConflict: "erp_code,country_code", ignoreDuplicates: false });
  }

  const erpCodes = Array.from(uniqueCustomers.keys());
  const { data: customers } = await supabase
    .from("customers")
    .select("id, erp_code")
    .eq("country_code", countryCode)
    .in("erp_code", erpCodes);

  for (const c of customers || []) {
    customerMap.set(c.erp_code, c.id);
  }

  return customerMap;
}

async function processAppointments(
  supabase: any,
  content: string,
  countryCode: string,
  logId: string
) {
  const lines = content.trim().split("\n");
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];

  const { data: userCodesData } = await supabase
    .from("user_codes")
    .select("id, code")
    .eq("country_code", countryCode);

  const userCodeMap = new Map<string, string>(
    (userCodesData || []).map((u: any) => [u.code, u.id])
  );

  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    processed++;
    const fields = line.split(";");
    try {
      if (fields.length < 13) throw new Error("Invalid format: not enough fields");
      const externalId = fields[0].trim();
      const userCode = fields[1].trim();
      const storeName = fields[2].trim();
      const dateStr = fields[3].trim();
      const timeStr = fields[4].trim();
      const durationStr = fields[5]?.trim() || null;
      const phone = fields[6]?.trim() || null;
      const address1 = fields[7]?.trim() || null;
      const address2 = fields[8]?.trim() || null;
      const postalCode = fields[9]?.trim() || null;
      const city = fields[10]?.trim() || null;
      const oldCrmCode = fields[11]?.trim() || null;
      const erpCode = fields[12]?.trim() || null;
      const typeIndicator = fields[13]?.trim() || null;

      const userCodeId = userCodeMap.get(userCode);
      if (!userCodeId) throw new Error(`User code ${userCode} not found`);

      const appointmentDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      const startHour = parseInt(timeStr.substring(0, 2), 10);
      const startMin = parseInt(timeStr.substring(2, 4), 10);
      const appointmentTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;

      let appointmentEndTime: string | null = null;
      if (durationStr) {
        const durationHours = parseInt(durationStr, 10);
        if (!isNaN(durationHours) && durationHours > 0) {
          const totalMinutes = startHour * 60 + startMin + durationHours * 60;
          const endHour = Math.floor(totalMinutes / 60) % 24;
          const endMin = totalMinutes % 60;
          appointmentEndTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;
        }
      }

      const typeMap: Record<string, string> = {
        "1": "animation",
        "2": "formation",
        "3": "rdv_passage",
      };
      const appointmentType = typeIndicator
        ? typeMap[typeIndicator] || null
        : null;

      const storeAddress = [address1, address2].filter(Boolean).join(", ") || null;

      upsertRows.push({
        external_id: externalId,
        user_code_id: userCodeId,
        country_code: countryCode,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_end_time: appointmentEndTime,
        appointment_type: appointmentType,
        store_name: storeName,
        store_address: storeAddress,
        store_city: city,
        store_postal_code: postalCode,
        old_crm_code: oldCrmCode,
        erp_code: erpCode,
        phone: phone,
        status: "scheduled",
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: (error as Error).message,
        raw_data: { line },
      });
    }
  }

  const customerMap = await upsertCustomersFromAppointments(
    supabase,
    upsertRows,
    countryCode
  );

  const upsertRowsWithCustomer = upsertRows.map((row) => ({
    ...row,
    customer_id: row.erp_code ? customerMap.get(row.erp_code) || null : null,
  }));

  for (let i = 0; i < upsertRowsWithCustomer.length; i += BATCH_SIZE) {
    const batch = upsertRowsWithCustomer.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("appointments")
      .upsert(batch, { onConflict: "external_id,country_code", ignoreDuplicates: false });
    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) await batchInsertErrors(supabase, logId, errorItems);

  const dates = [...new Set(upsertRows.map(r => r.appointment_date))];
  const userCodeIds = [...new Set(upsertRows.map(r => r.user_code_id))];
  const cancelled = await deduplicateOverlappingAppointments(supabase, countryCode, userCodeIds, dates);

  return { processed, success, errors, duplicates_cancelled: cancelled };
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + 60;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:00`;
}

async function deduplicateOverlappingAppointments(
  supabase: any,
  countryCode: string,
  userCodeIds: string[],
  dates: string[]
): Promise<number> {
  if (userCodeIds.length === 0 || dates.length === 0) return 0;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, user_code_id, appointment_date, appointment_time, appointment_end_time, created_at, external_id")
    .eq("country_code", countryCode)
    .eq("status", "scheduled")
    .in("user_code_id", userCodeIds)
    .in("appointment_date", dates);

  if (!appointments || appointments.length === 0) return 0;

  const { data: reportsData } = await supabase
    .from("sales_reports")
    .select("appointment_id")
    .in("appointment_id", appointments.map((a: any) => a.id));

  const protectedIds = new Set((reportsData || []).map((r: any) => r.appointment_id));

  const grouped = new Map<string, any[]>();
  for (const apt of appointments) {
    const key = `${apt.user_code_id}|${apt.appointment_date}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(apt);
  }

  const toCancel = new Set<string>();

  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    group.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    for (let i = 0; i < group.length; i++) {
      if (protectedIds.has(group[i].id) || toCancel.has(group[i].id)) continue;

      for (let j = i + 1; j < group.length; j++) {
        if (protectedIds.has(group[j].id) || toCancel.has(group[j].id)) continue;

        const startA = group[i].appointment_time;
        const endA = group[i].appointment_end_time || addOneHour(startA);
        const startB = group[j].appointment_time;
        const endB = group[j].appointment_end_time || addOneHour(startB);

        if (startA < endB && startB < endA) {
          toCancel.add(group[j].id);
        }
      }
    }
  }

  const cancelIds = [...toCancel];
  if (cancelIds.length > 0) {
    for (let i = 0; i < cancelIds.length; i += BATCH_SIZE) {
      const batch = cancelIds.slice(i, i + BATCH_SIZE);
      await supabase
        .from("appointments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .in("id", batch);
    }
  }

  return cancelIds.length;
}

async function processFileLocally(
  supabase: any,
  file: FileInfo,
  countryCode: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const logTypeMap = {
    users: "import_users",
    products: "import_products",
    appointments: "import_appointments",
  } as const;

  if (file.type === "unknown") {
    return { success: false, error: "Type de fichier inconnu" };
  }

  const { data: logEntry, error: logError } = await supabase
    .from("import_export_logs")
    .insert({
      type: logTypeMap[file.type],
      country_code: countryCode,
      filename: file.filename,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (logError || !logEntry) {
    return {
      success: false,
      error: logError?.message || "Failed to create import log",
    };
  }

  try {
    let result;
    switch (file.type) {
      case "users":
        result = await processUsers(supabase, file.content, countryCode, logEntry.id);
        break;
      case "products":
        result = await processProducts(supabase, file.content, countryCode, logEntry.id);
        break;
      case "appointments":
        result = await processAppointments(supabase, file.content, countryCode, logEntry.id);
        break;
    }

    await supabase
      .from("import_export_logs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        rows_processed: result!.processed,
        rows_success: result!.success,
        rows_error: result!.errors,
      })
      .eq("id", logEntry.id);

    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await supabase
      .from("import_export_logs")
      .update({
        status: "error",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", logEntry.id);
    return { success: false, error: errorMessage };
  }
}

async function runImport(
  supabase: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  triggeredBy: string,
  retryCount: number,
  parentOperationId: string | null
): Promise<{ success: boolean; operationId: string; message: string }> {
  const { data: operation, error: opError } = await supabase
    .from("sftp_sync_operations")
    .insert({
      sftp_config_id: config.id,
      operation_type: "import",
      status: "running",
      started_at: new Date().toISOString(),
      created_by: null,
      triggered_by: triggeredBy,
      retry_count: retryCount,
      parent_operation_id: parentOperationId,
    })
    .select()
    .single();

  if (opError || !operation) {
    throw new Error("Failed to create import sync operation");
  }

  try {
    const password = atob(config.password_encrypted as string);
    const files: FileInfo[] = [];
    let filesProcessed = 0;
    let filesFailed = 0;

    const { Client } = await import("npm:ssh2@1.15.0");
    await new Promise<void>((resolve, reject) => {
      const client = new Client();

      client.on("ready", () => {
        client.sftp((err: Error | undefined, sftp: unknown) => {
          if (err) {
            reject(err);
            return;
          }

          const sftpAny = sftp as any;
          sftpAny.readdir(
            config.import_path,
            async (err: Error | undefined, list: any[]) => {
              if (err) {
                reject(
                  new Error(
                    `Impossible de lire le repertoire "${config.import_path}": ${err.message}`
                  )
                );
                return;
              }

              const txtFiles = list.filter(
                (file: any) =>
                  file.attrs.isFile() && file.filename.endsWith(".txt")
              );

              if (txtFiles.length === 0) {
                client.end();
                resolve();
                return;
              }

              let processed = 0;
              const total = txtFiles.length;

              for (const file of txtFiles) {
                const filePath = `${config.import_path}/${file.filename}`;

                sftpAny.readFile(
                  filePath,
                  (err: Error | undefined, buffer: Buffer) => {
                    if (err) {
                      filesFailed++;
                    } else {
                      const content = new TextDecoder("windows-1252").decode(
                        buffer
                      );
                      files.push({
                        filename: file.filename,
                        content,
                        type: determineFileType(file.filename),
                      });
                    }

                    processed++;
                    if (processed === total) {
                      client.end();
                      resolve();
                    }
                  }
                );
              }
            }
          );
        });
      });

      client.on("error", (err: Error) => reject(err));

      client.connect({
        host: config.host as string,
        port: config.port as number,
        username: config.username as string,
        password,
        readyTimeout: 30000,
        keepaliveInterval: 5000,
      });
    });

    const processResults: unknown[] = [];
    const filesToDelete: string[] = [];

    const typeOrder: Record<string, number> = { users: 0, products: 1, appointments: 2, unknown: 3 };
    files.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

    for (const file of files) {
      const fileStartTime = Date.now();

      if (file.type === "unknown") {
        filesFailed++;
        await supabase.from("sftp_file_logs").insert({
          filename: file.filename,
          operation_type: "import",
          file_type: "unknown",
          status: "failed",
          records_processed: 0,
          records_failed: 0,
          error_message: "Type de fichier inconnu",
          processing_time_ms: Date.now() - fileStartTime,
          file_size_bytes: new TextEncoder().encode(file.content).length,
        });
        continue;
      }

      try {
        const result = await processFileLocally(
          supabase,
          file,
          config.country_code as string
        );

        processResults.push({
          filename: file.filename,
          type: file.type,
          result,
        });

        if (result.success) {
          filesProcessed++;
          filesToDelete.push(file.filename);
          await supabase.from("sftp_file_logs").insert({
            filename: file.filename,
            operation_type: "import",
            file_type: file.type,
            status: "success",
            records_processed: result.result?.processed || 0,
            records_failed: result.result?.errors || 0,
            processing_time_ms: Date.now() - fileStartTime,
            file_size_bytes: new TextEncoder().encode(file.content).length,
          });
        } else {
          filesFailed++;
          await supabase.from("sftp_file_logs").insert({
            filename: file.filename,
            operation_type: "import",
            file_type: file.type,
            status: "failed",
            records_processed: 0,
            records_failed: 0,
            error_message: result.error || "echec du traitement",
            processing_time_ms: Date.now() - fileStartTime,
            file_size_bytes: new TextEncoder().encode(file.content).length,
          });
        }
      } catch (error) {
        filesFailed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        processResults.push({
          filename: file.filename,
          type: file.type,
          error: errorMessage,
        });
        await supabase.from("sftp_file_logs").insert({
          filename: file.filename,
          operation_type: "import",
          file_type: file.type,
          status: "failed",
          records_processed: 0,
          records_failed: 0,
          error_message: errorMessage,
          processing_time_ms: Date.now() - fileStartTime,
          file_size_bytes: new TextEncoder().encode(file.content).length,
        });
      }
    }

    let filesDeleted = 0;
    let deletionErrors = 0;

    if (filesToDelete.length > 0) {
      const password = atob(config.password_encrypted as string);
      const { Client: SFTPClient } = await import("npm:ssh2@1.15.0");
      await new Promise<void>((resolve, reject) => {
        const client = new SFTPClient();

        client.on("ready", () => {
          client.sftp((err: Error | undefined, sftp: unknown) => {
            if (err) {
              reject(err);
              return;
            }

            const sftpAny = sftp as any;
            let deletedCount = 0;
            const total = filesToDelete.length;

            for (const filename of filesToDelete) {
              const filePath = `${config.import_path}/${filename}`;
              sftpAny.unlink(filePath, (err: Error | undefined) => {
                if (err) {
                  deletionErrors++;
                } else {
                  filesDeleted++;
                }
                deletedCount++;
                if (deletedCount === total) {
                  client.end();
                  resolve();
                }
              });
            }
          });
        });

        client.on("error", (err: Error) => reject(err));

        client.connect({
          host: config.host as string,
          port: config.port as number,
          username: config.username as string,
          password,
          readyTimeout: 30000,
          keepaliveInterval: 5000,
        });
      });
    }

    const finalStatus =
      filesFailed > 0 && filesProcessed === 0 ? "failed" : "completed";

    await supabase
      .from("sftp_sync_operations")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        files_processed: filesProcessed,
        files_failed: filesFailed,
        details: {
          totalFiles: files.length,
          processResults,
          filesDeleted,
          deletionErrors,
          automated: true,
        },
      })
      .eq("id", operation.id);

    return {
      success: finalStatus === "completed",
      operationId: operation.id,
      message: `Import: ${filesProcessed} fichier(s) traite(s), ${filesFailed} echec(s)`,
    };
  } catch (error) {
    await supabase
      .from("sftp_sync_operations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", operation.id);

    return {
      success: false,
      operationId: operation.id,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

async function runExport(
  supabase: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  triggeredBy: string,
  retryCount: number,
  parentOperationId: string | null
): Promise<{ success: boolean; operationId: string; message: string }> {
  const { data: operation, error: opError } = await supabase
    .from("sftp_sync_operations")
    .insert({
      sftp_config_id: config.id,
      operation_type: "export",
      status: "running",
      started_at: new Date().toISOString(),
      created_by: null,
      triggered_by: triggeredBy,
      retry_count: retryCount,
      parent_operation_id: parentOperationId,
    })
    .select()
    .single();

  if (opError || !operation) {
    throw new Error("Failed to create export sync operation");
  }

  try {
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/export-sales`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          Apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        },
        body: JSON.stringify({
          countryCode: config.country_code,
          mode: "full",
        }),
      }
    );

    let result: any;
    try {
      result = await response.json();
    } catch {
      result = {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const exportSuccess = response.ok && result.success;
    const noReportsToExport =
      response.status === 404 && result.message === "No reports to export";

    let retryResult: any = null;
    try {
      const retryResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/export-sales`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            Apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          },
          body: JSON.stringify({
            countryCode: config.country_code,
            mode: "sftp_only",
          }),
        }
      );
      try {
        retryResult = await retryResponse.json();
      } catch {
        retryResult = null;
      }
    } catch (retryError) {
      retryResult = {
        success: false,
        message:
          retryError instanceof Error
            ? retryError.message
            : "SFTP retry pass failed",
      };
    }

    const retryFailed =
      retryResult &&
      retryResult.success === false &&
      retryResult.failedCount &&
      retryResult.failedCount > 0;

    const finalStatus =
      (exportSuccess || noReportsToExport) && !retryFailed
        ? "completed"
        : "failed";

    await supabase
      .from("sftp_sync_operations")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        files_processed: result.reportsCount || 0,
        files_failed: retryResult?.failedCount || 0,
        error_message:
          finalStatus === "failed"
            ? retryFailed
              ? retryResult?.message || "SFTP retry failed"
              : result.message
            : null,
        details: {
          ...result,
          automated: true,
          noReportsToExport,
          sftpRetry: retryResult,
        },
      })
      .eq("id", operation.id);

    return {
      success: finalStatus === "completed",
      operationId: operation.id,
      message:
        finalStatus === "completed"
          ? noReportsToExport
            ? "Export: Aucun CR a exporter"
            : `Export: ${result.reportsCount || 0} CR exporte(s)`
          : result.message || "Export failed",
    };
  } catch (error) {
    await supabase
      .from("sftp_sync_operations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", operation.id);

    return {
      success: false,
      operationId: operation.id,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      configId,
      triggered_by,
      parent_operation_id,
      retry_count = 0,
    }: ScheduledSyncRequest = await req.json();

    if (!configId) {
      return new Response(
        JSON.stringify({ success: false, message: "configId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: config, error: configError } = await supabase
      .from("sftp_configurations")
      .select("*")
      .eq("id", configId)
      .eq("active", true)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration SFTP introuvable ou inactive",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[scheduled-sftp-sync] Starting ${triggered_by} sync for ${config.country_code} (retry: ${retry_count})`
    );

    const importResult = await runImport(
      supabase,
      config,
      triggered_by,
      retry_count,
      parent_operation_id || null
    );

    console.log(
      `[scheduled-sftp-sync] Import result: ${importResult.success ? "OK" : "FAILED"} - ${importResult.message}`
    );

    const exportResult = await runExport(
      supabase,
      config,
      triggered_by,
      retry_count,
      parent_operation_id || null
    );

    console.log(
      `[scheduled-sftp-sync] Export result: ${exportResult.success ? "OK" : "FAILED"} - ${exportResult.message}`
    );

    await supabase
      .from("sftp_configurations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_scheduled_run_at: new Date().toISOString(),
      })
      .eq("id", configId);

    const overallSuccess = importResult.success && exportResult.success;

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        import: importResult,
        export: exportResult,
        failed_step: !importResult.success
          ? "import"
          : !exportResult.success
            ? "export"
            : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[scheduled-sftp-sync] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la synchronisation planifiee",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
