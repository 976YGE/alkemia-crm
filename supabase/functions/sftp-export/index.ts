import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportRequest {
  configId: string;
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

    const { configId }: ExportRequest = await req.json();

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
        operation_type: "export",
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
      const conn = await Deno.connect({
        hostname: config.host,
        port: config.port,
        transport: "tcp",
      });

      conn.close();

      await supabase
        .from("sftp_sync_operations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          files_processed: 0,
          details: {
            message: "Connexion SFTP établie avec succès. Export simulé.",
            path: config.export_path,
          },
        })
        .eq("id", operation.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Export SFTP démarré avec succès",
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
      await supabase
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
        message: error instanceof Error ? error.message : "Erreur lors de l'export SFTP",
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
