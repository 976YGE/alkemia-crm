import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  type: "day_before" | "end_of_day" | "cr_summary";
  appointment_id?: string;
  sales_report_id?: string;
  user_id?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "notifications@patyka.com";

  if (!apiKey) {
    console.log(`[Notification] No RESEND_API_KEY — email would be sent to ${to}: ${subject}`);
    return;
  }

  console.log(`[Notification] Sending email to ${to} from ${fromEmail}: ${subject}`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
    console.error(`[Notification] Resend error for ${to}:`, error);
    throw new Error(`Failed to send email to ${to}: ${error}`);
  }

  console.log(`[Notification] Email sent successfully to ${to}`);
}

function formatDate(dateStr: string, timeStr: string): string {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDayBeforeEmail(appointment: Record<string, string>, userName: string): { subject: string; html: string } {
  const dateStr = formatDate(appointment.appointment_date, appointment.appointment_time);
  const subject = `Rappel : Animation demain — ${appointment.store_name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: #1d4ed8; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">PATYKA — Rappel Animation</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px;">Bonjour <strong>${userName}</strong>,</p>
        <p style="color: #374151;">Vous avez une animation demain :</p>
        <div style="background: #eff6ff; border-left: 4px solid #1d4ed8; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #1e40af;">${appointment.store_name}</p>
          <p style="margin: 0 0 6px 0; color: #374151;">📅 ${dateStr}</p>
          ${appointment.store_address ? `<p style="margin: 0 0 6px 0; color: #374151;">📍 ${appointment.store_address}${appointment.store_city ? `, ${appointment.store_city}` : ""}${appointment.store_postal_code ? ` ${appointment.store_postal_code}` : ""}</p>` : ""}
          ${appointment.phone ? `<p style="margin: 0; color: #374151;">📞 ${appointment.phone}</p>` : ""}
        </div>
        <p style="color: #6b7280; font-size: 14px;">Bonne animation !</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">PATYKA — Ne pas répondre à cet email</p>
      </div>
    </div>
  `;
  return { subject, html };
}

function buildEndOfDayEmail(appointment: Record<string, string>, userName: string, reportUrl: string): { subject: string; html: string } {
  const subject = `Rappel : Compte rendu à saisir — ${appointment.store_name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: #1d4ed8; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">PATYKA — Compte Rendu</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px;">Bonjour <strong>${userName}</strong>,</p>
        <p style="color: #374151;">Votre animation d'aujourd'hui chez <strong>${appointment.store_name}</strong> est terminée.</p>
        <p style="color: #374151;">N'oubliez pas de compléter votre compte rendu de ventes.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${reportUrl}" style="background: #1d4ed8; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Saisir mon compte rendu</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">PATYKA — Ne pas répondre à cet email</p>
      </div>
    </div>
  `;
  return { subject, html };
}

function buildCrSummaryEmail(
  appointment: Record<string, string>,
  report: Record<string, unknown>,
  lines: Array<Record<string, unknown>>,
  userName: string
): { subject: string; html: string } {
  const dateStr = formatDate(appointment.appointment_date, appointment.appointment_time);
  const subject = `Compte rendu validé — ${appointment.store_name} — ${appointment.appointment_date}`;

  const currency = appointment.country_code === 'CH' ? 'CHF' : '€';
  const linesHtml = lines.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #eff6ff;">
            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; color: #1e40af;">Produit</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #1e40af;">Qté</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; color: #1e40af;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${lines.map((l) => `
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #e5e7eb; color: #374151;">${(l.product as Record<string, string>)?.name || "—"}</td>
              <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center; color: #374151;">${l.quantity}</td>
              <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: right; color: #374151;">${Number(l.line_amount).toFixed(2)} ${currency}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr style="background: #f9fafb;">
            <td colspan="2" style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">CA Global</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #1e40af;">${Number(report.total_amount).toFixed(2)} ${currency}</td>
          </tr>
        </tfoot>
      </table>
    `
    : "<p style='color: #6b7280;'>Aucun produit saisi.</p>";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: #1d4ed8; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">PATYKA — Récapitulatif Compte Rendu</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px;">Bonjour <strong>${userName}</strong>,</p>
        <p style="color: #374151;">Votre compte rendu a été validé avec succès.</p>
        <div style="background: #eff6ff; border-left: 4px solid #1d4ed8; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: #1e40af;">${appointment.store_name}</p>
          <p style="margin: 0; color: #374151;">📅 ${dateStr}</p>
        </div>
        <h3 style="color: #374151; margin-top: 24px;">Détail des ventes</h3>
        ${linesHtml}
        ${report.comment ? `<p style="color: #374151;"><strong>Commentaire :</strong> ${report.comment}</p>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">PATYKA — Ne pas répondre à cet email</p>
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.patyka.com";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotificationRequest = await req.json();
    const { type } = body;

    if (type === "cr_summary") {
      const { sales_report_id } = body;
      if (!sales_report_id) throw new Error("sales_report_id required");

      // Load report with lines and appointment
      const { data: report, error: reportError } = await adminClient
        .from("sales_reports")
        .select(`*, appointment:appointments(*), lines:sales_report_lines(*, product:products(*))`)
        .eq("id", sales_report_id)
        .maybeSingle();

      if (reportError || !report) throw new Error("Report not found");

      // Load user info + preferences
      const { data: userRow } = await adminClient
        .from("users")
        .select("*, user_code:user_codes(*)")
        .eq("id", user.id)
        .maybeSingle();

      const { data: prefs } = await adminClient
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const userName = userRow?.user_code
        ? `${userRow.user_code.first_name} ${userRow.user_code.last_name}`
        : user.email || "Animateur";

      const notifications: Array<Promise<void>> = [];

      // Send to animator if preference enabled (default true)
      if (!prefs || prefs.notify_cr_summary) {
        const { subject, html } = buildCrSummaryEmail(
          report.appointment,
          report,
          report.lines || [],
          userName
        );
        notifications.push(
          sendEmail(user.email!, subject, html).then(() =>
            adminClient.from("notification_logs").insert({
              user_id: user.id,
              notification_type: "cr_summary",
              appointment_id: report.appointment_id,
              sales_report_id,
              recipient_email: user.email,
              status: "sent",
            })
          ).then(() => undefined)
        );
      }

      // Admin notifications
      const countryCode = userRow?.country_code;
      if (countryCode) {
        const { data: adminSettings } = await adminClient
          .from("admin_notification_settings")
          .select("*")
          .eq("country_code", countryCode)
          .maybeSingle();

        if (adminSettings?.notify_on_cr_submit) {
          // Find admin users for this country
          const { data: admins } = await adminClient
            .from("users")
            .select("id, email")
            .eq("country_code", countryCode)
            .in("role", ["admin", "super_admin"]);

          const adminEmails = (admins || []).map((a: Record<string, string>) => a.email).filter(Boolean);
          const extraEmails: string[] = adminSettings.additional_recipients || [];
          const allAdminEmails = [...new Set([...adminEmails, ...extraEmails])];

          for (const email of allAdminEmails) {
            if (!email) continue;
            const { subject, html } = buildCrSummaryEmail(
              report.appointment,
              report,
              report.lines || [],
              `${userName} (Admin notification)`
            );
            notifications.push(
              sendEmail(email, `[Admin] ${subject}`, html).then(() =>
                adminClient.from("notification_logs").insert({
                  user_id: user.id,
                  notification_type: "cr_summary",
                  appointment_id: report.appointment_id,
                  sales_report_id,
                  recipient_email: email,
                  status: "sent",
                  metadata: { admin_notification: true },
                })
              ).then(() => undefined)
            );
          }
        }

        // Additional recipients regardless of notify_on_cr_submit
        if (adminSettings?.additional_recipients?.length && !adminSettings.notify_on_cr_submit) {
          for (const email of adminSettings.additional_recipients) {
            if (!email) continue;
            const { subject, html } = buildCrSummaryEmail(
              report.appointment,
              report,
              report.lines || [],
              userName
            );
            notifications.push(
              sendEmail(email, subject, html).then(() => undefined)
            );
          }
        }
      }

      await Promise.allSettled(notifications);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown notification type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
