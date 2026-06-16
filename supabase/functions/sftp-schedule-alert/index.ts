import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertRequest {
  configId: string;
  operationIds: string[];
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("NOTIFICATION_FROM_EMAIL") || "notifications@patyka.com";

  if (!apiKey) {
    console.log(
      `[sftp-schedule-alert] No RESEND_API_KEY — email would be sent to ${to}: ${subject}`
    );
    return true;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PATYKA <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[sftp-schedule-alert] Resend error for ${to}:`, error);
    return false;
  }

  return true;
}

function buildAlertEmail(
  countryCode: string,
  countryName: string,
  host: string,
  port: number,
  failureCount: number,
  lastError: string,
  lastFailedAt: string,
  appUrl: string
): { subject: string; html: string } {
  const subject = `[ALERTE] Synchronisation SFTP en echec — ${countryName} (${countryCode})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: #dc2626; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">PATYKA — Alerte Synchronisation SFTP</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 0 0 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #991b1b;">
            ${failureCount} echecs consecutifs detectes
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; color: #374151; width: 40%;">Pays</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${countryName} (${countryCode})</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; color: #374151;">Serveur SFTP</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${host}:${port}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; color: #374151;">Dernier echec</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${lastFailedAt}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; color: #374151;">Erreur</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;">${lastError}</td>
          </tr>
        </table>

        <p style="color: #374151; margin-top: 24px;">
          Le systeme a tente ${failureCount} fois de synchroniser les donnees sans succes.
          Les tentatives automatiques sont suspendues pour cette execution.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/admin/sftp-operations" style="background: #1d4ed8; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Voir les operations SFTP
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">PATYKA — Alerte automatique, ne pas repondre</p>
      </div>
    </div>
  `;

  return { subject, html };
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

    const { configId, operationIds }: AlertRequest = await req.json();

    if (!configId) {
      return new Response(
        JSON.stringify({ success: false, message: "configId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: config } = await supabase
      .from("sftp_configurations")
      .select("*")
      .eq("id", configId)
      .maybeSingle();

    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration introuvable",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: country } = await supabase
      .from("countries")
      .select("name")
      .eq("code", config.country_code)
      .maybeSingle();

    const countryName = country?.name || config.country_code;

    const { data: lastFailedOp } = await supabase
      .from("sftp_sync_operations")
      .select("error_message, completed_at")
      .eq("sftp_config_id", configId)
      .eq("status", "failed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastError =
      lastFailedOp?.error_message || "Erreur inconnue";
    const lastFailedAt = lastFailedOp?.completed_at
      ? new Date(lastFailedOp.completed_at).toLocaleString("fr-FR", {
          timeZone: "Europe/Paris",
        })
      : "Inconnu";

    const recipients: string[] = [];

    const { data: superAdmins } = await supabase
      .from("users")
      .select("email")
      .eq("role", "super_admin");

    if (superAdmins) {
      for (const admin of superAdmins) {
        if (admin.email) recipients.push(admin.email);
      }
    }

    const { data: adminSettings } = await supabase
      .from("admin_notification_settings")
      .select("additional_recipients")
      .eq("country_code", config.country_code)
      .maybeSingle();

    if (adminSettings?.additional_recipients) {
      for (const email of adminSettings.additional_recipients) {
        if (email && !recipients.includes(email)) {
          recipients.push(email);
        }
      }
    }

    if (recipients.length === 0) {
      console.log(
        "[sftp-schedule-alert] No recipients found, skipping alert"
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: "No recipients configured",
          alertSent: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://app.patyka.com";

    const { subject, html } = buildAlertEmail(
      config.country_code,
      countryName,
      config.host,
      config.port,
      operationIds.length,
      lastError,
      lastFailedAt,
      appUrl
    );

    let sentCount = 0;
    for (const email of recipients) {
      const sent = await sendEmail(email, subject, html);
      if (sent) sentCount++;
    }

    await supabase.from("sftp_schedule_alerts").insert({
      sftp_config_id: configId,
      alert_type: "max_retries_reached",
      operation_ids: operationIds,
      recipients,
      sent_at: new Date().toISOString(),
      details: {
        country_code: config.country_code,
        country_name: countryName,
        failure_count: operationIds.length,
        last_error: lastError,
        emails_sent: sentCount,
        emails_total: recipients.length,
      },
    });

    console.log(
      `[sftp-schedule-alert] Alert sent to ${sentCount}/${recipients.length} recipients for ${config.country_code}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        alertSent: true,
        recipientCount: sentCount,
        totalRecipients: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sftp-schedule-alert] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'envoi de l'alerte",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
