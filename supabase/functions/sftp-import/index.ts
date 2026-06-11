import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImportRequest {
  configId: string;
}

interface FileInfo {
  filename: string;
  content: string;
  type: 'users' | 'products' | 'appointments' | 'unknown';
}

function determineFileType(filename: string): 'users' | 'products' | 'appointments' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.includes('user')) return 'users';
  if (lower.includes('produit') || lower.includes('product')) return 'products';
  if (lower.includes('agenda') || lower.includes('appointment')) return 'appointments';
  return 'unknown';
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    let serverIp: string | null = null;
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      serverIp = ipData.ip || null;
    } catch {
      serverIp = null;
    }

    const { configId }: ImportRequest = await req.json();

    if (!configId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration ID is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: config, error: configError } = await supabase
      .from("sftp_configurations")
      .select("*")
      .eq("id", configId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration SFTP introuvable",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: operation, error: operationError } = await supabase
      .from("sftp_sync_operations")
      .insert({
        sftp_config_id: configId,
        operation_type: "import",
        status: "running",
        started_at: new Date().toISOString(),
        created_by: user.id,
        requester_ip: serverIp,
      })
      .select()
      .single();

    if (operationError || !operation) {
      throw new Error("Failed to create sync operation");
    }

    try {
      const password = atob(config.password_encrypted);
      const files: FileInfo[] = [];
      let filesProcessed = 0;
      let filesFailed = 0;

      const { Client } = await import("npm:ssh2@1.15.0");
      await new Promise<void>((resolve, reject) => {
        const client = new Client();

        client.on('ready', () => {
          client.sftp((err: Error | undefined, sftp: any) => {
            if (err) {
              reject(err);
              return;
            }

            sftp.readdir(config.import_path, async (err: Error | undefined, list: any[]) => {
              if (err) {
                const detailedError = new Error(
                  `Impossible de lire le répertoire "${config.import_path}": ${err.message}. Vérifiez que le chemin existe et est accessible.`
                );
                reject(detailedError);
                return;
              }

              const txtFiles = list.filter((file: any) =>
                file.attrs.isFile() && file.filename.endsWith('.txt')
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

                sftp.readFile(filePath, async (err: Error | undefined, buffer: Buffer) => {
                  if (err) {
                    filesFailed++;
                  } else {
                    const content = new TextDecoder('windows-1252').decode(buffer);

                    const fileType = determineFileType(file.filename);
                    files.push({
                      filename: file.filename,
                      content: content,
                      type: fileType,
                    });
                  }

                  processed++;
                  if (processed === total) {
                    client.end();
                    resolve();
                  }
                });
              }
            });
          });
        });

        client.on('error', (err: Error) => {
          reject(err);
        });

        client.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: password,
          readyTimeout: 30000,
          keepaliveInterval: 5000,
        });
      });

      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const processResults = [];
      const filesToDelete: string[] = [];

      const typeOrder: Record<string, number> = { users: 0, products: 1, appointments: 2, unknown: 3 };
      files.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

      for (const file of files) {
        const fileStartTime = Date.now();

        if (file.type === 'unknown') {
          filesFailed++;

          await supabaseServiceClient
            .from('sftp_file_logs')
            .insert({
              filename: file.filename,
              operation_type: 'import',
              file_type: 'unknown',
              status: 'failed',
              records_processed: 0,
              records_failed: 0,
              error_message: 'Type de fichier inconnu',
              processing_time_ms: Date.now() - fileStartTime,
              file_size_bytes: new TextEncoder().encode(file.content).length,
              created_by: user.id,
            });

          continue;
        }

        try {
          const response = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-imports`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                'Apikey': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '',
              },
              body: JSON.stringify({
                countryCode: config.country_code,
                fileType: file.type,
                fileContent: file.content,
                filename: file.filename,
              }),
            }
          );

          let result: any;
          try {
            result = await response.json();
          } catch (_) {
            result = { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
          }
          const processingTime = Date.now() - fileStartTime;

          processResults.push({
            filename: file.filename,
            type: file.type,
            result,
          });

          if (result.success) {
            filesProcessed++;
            filesToDelete.push(file.filename);

            await supabaseServiceClient
              .from('sftp_file_logs')
              .insert({
                filename: file.filename,
                operation_type: 'import',
                file_type: file.type,
                status: 'success',
                records_processed: result.result?.processed || 0,
                records_failed: result.result?.errors || 0,
                processing_time_ms: processingTime,
                file_size_bytes: new TextEncoder().encode(file.content).length,
                created_by: user.id,
              });
          } else {
            filesFailed++;
            const errorMsg = result.error || result.message || `HTTP ${response.status}: échec du traitement`;

            await supabaseServiceClient
              .from('sftp_file_logs')
              .insert({
                filename: file.filename,
                operation_type: 'import',
                file_type: file.type,
                status: 'failed',
                records_processed: 0,
                records_failed: 0,
                error_message: errorMsg,
                processing_time_ms: processingTime,
                file_size_bytes: new TextEncoder().encode(file.content).length,
                created_by: user.id,
              });
          }
        } catch (error) {
          filesFailed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          processResults.push({
            filename: file.filename,
            type: file.type,
            error: errorMessage,
          });

          await supabaseServiceClient
            .from('sftp_file_logs')
            .insert({
              filename: file.filename,
              operation_type: 'import',
              file_type: file.type,
              status: 'failed',
              records_processed: 0,
              records_failed: 0,
              error_message: errorMessage,
              processing_time_ms: Date.now() - fileStartTime,
              file_size_bytes: new TextEncoder().encode(file.content).length,
              created_by: user.id,
            });
        }
      }

      let filesDeleted = 0;
      let deletionErrors = 0;

      if (filesToDelete.length > 0) {
        const { Client: SFTPClient } = await import("npm:ssh2@1.15.0");
        await new Promise<void>((resolve, reject) => {
          const client = new SFTPClient();

          client.on('ready', () => {
            client.sftp((err: Error | undefined, sftp: any) => {
              if (err) {
                reject(err);
                return;
              }

              let deletedCount = 0;
              const total = filesToDelete.length;

              for (const filename of filesToDelete) {
                const filePath = `${config.import_path}/${filename}`;

                sftp.unlink(filePath, (err: Error | undefined) => {
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

          client.on('error', (err: Error) => {
            reject(err);
          });

          client.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            password: password,
            readyTimeout: 30000,
            keepaliveInterval: 5000,
          });
        });
      }

      await supabaseServiceClient
        .from("sftp_sync_operations")
        .update({
          status: filesFailed > 0 && filesProcessed === 0 ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          files_processed: filesProcessed,
          files_failed: filesFailed,
          details: {
            totalFiles: files.length,
            processResults,
            filesDeleted,
            deletionErrors,
          },
        })
        .eq("id", operation.id);

      await supabaseServiceClient
        .from("sftp_configurations")
        .update({
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", configId);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Import terminé: ${filesProcessed} fichier(s) traité(s), ${filesFailed} échec(s)`,
          operationId: operation.id,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseServiceClient
        .from("sftp_sync_operations")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", operation.id);

      throw error;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors de l'import SFTP",
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
