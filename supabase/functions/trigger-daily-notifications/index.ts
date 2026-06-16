import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "notifications@patyka.com";

  if (!apiKey) {
    console.log(`[Notification] Email would be sent to ${to}: ${subject}`);
    return;
  }

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
    throw new Error(`Failed to send email: ${error}`);
  }
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

function buildDayBeforeEmail(
  appointment: Record<string, string>,
  userName: string
): { subject: string; html: string } {
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

function buildEndOfDayEmail(
  appointment: Record<string, string>,
  userName: string,
  appUrl: string
): { subject: string; html: string } {
  const subject = `Rappel : Compte rendu à saisir — ${appointment.store_name}`;
  const reportUrl = `${appUrl}/agenda/${appointment.id}`;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.patyka.com";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const notificationType: "day_before" | "end_of_day" | "test_cr_summary" = body.type || "day_before";

    if (notificationType === "test_cr_summary") {
      const { sales_report_id } = body;
      if (!sales_report_id) {
        return new Response(JSON.stringify({ error: "sales_report_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: report, error: reportError } = await adminClient
        .from("sales_reports")
        .select(`*, appointment:appointments(*), lines:sales_report_lines(*, product:products(*))`)
        .eq("id", sales_report_id)
        .maybeSingle();

      if (reportError || !report) {
        return new Response(JSON.stringify({ error: "Report not found", detail: reportError }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userRow } = await adminClient
        .from("users")
        .select("*, user_code:user_codes(*)")
        .eq("id", report.user_id)
        .maybeSingle();

      if (!userRow?.email) {
        return new Response(JSON.stringify({ error: "User email not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userName = userRow.user_code
        ? `${userRow.user_code.first_name} ${userRow.user_code.last_name}`
        : userRow.email;

      const { subject, html } = buildCrSummaryEmail(
        report.appointment,
        report,
        report.lines || [],
        userName
      );

      console.log(`[Test] Sending CR summary to ${userRow.email}`);
      await sendEmail(userRow.email, `[TEST] ${subject}`, html);

      await adminClient.from("notification_logs").insert({
        user_id: report.user_id,
        notification_type: "cr_summary",
        appointment_id: report.appointment_id,
        sales_report_id,
        recipient_email: userRow.email,
        status: "sent",
        metadata: { test: true },
      });

      return new Response(JSON.stringify({ success: true, sent_to: userRow.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    let targetDateStr: string;
    if (notificationType === "day_before") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDateStr = tomorrow.toISOString().split("T")[0];
    } else {
      targetDateStr = todayStr;
    }

    // Load appointments for the target date
    const query = adminClient
      .from("appointments")
      .select("*, user_code:user_codes(*, users(id, email))")
      .eq("appointment_date", targetDateStr)
      .neq("status", "cancelled")
      .neq("store_name", "INCONNUE");

    // For end_of_day, only appointments with no CR
    let appointments: Array<Record<string, unknown>> = [];
    const { data: appts, error: apptError } = await query;
    if (apptError) throw apptError;

    if (notificationType === "end_of_day") {
      // Exclude formation appointments and those already marked as not requiring a CR
      const apptsNeedingReport = (appts || []).filter(
        (a: Record<string, unknown>) =>
          a.appointment_type !== "formation" && !a.report_not_required
      );

      const apptIds = apptsNeedingReport.map((a: Record<string, unknown>) => a.id);
      if (apptIds.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingReports } = await adminClient
        .from("sales_reports")
        .select("appointment_id")
        .in("appointment_id", apptIds)
        .eq("status", "validated");

      const reportedIds = new Set((existingReports || []).map((r: Record<string, string>) => r.appointment_id));
      appointments = apptsNeedingReport.filter((a: Record<string, unknown>) => !reportedIds.has(a.id as string));
    } else {
      appointments = appts || [];
    }

    let sent = 0;
    const errors: string[] = [];

    for (const appointment of appointments) {
      try {
        const userCode = appointment.user_code as Record<string, unknown>;
        if (!userCode) continue;

        const users = userCode.users as Array<Record<string, string>> | Record<string, string> | null;
        let userRow: Record<string, string> | null = null;
        if (Array.isArray(users)) {
          if (users.length === 0) continue;
          userRow = users[0];
        } else if (users && typeof users === "object") {
          userRow = users;
        } else {
          continue;
        }

        if (!userRow?.email) continue;

        // Check user preferences
        const { data: prefs } = await adminClient
          .from("user_notification_preferences")
          .select("*")
          .eq("user_id", userRow.id)
          .maybeSingle();

        const prefKey = notificationType === "day_before" ? "notify_day_before" : "notify_end_of_day";
        if (prefs && !prefs[prefKey]) continue;

        const userName = `${userCode.first_name} ${userCode.last_name}`;

        let subject: string;
        let html: string;

        if (notificationType === "day_before") {
          ({ subject, html } = buildDayBeforeEmail(appointment as Record<string, string>, userName));
        } else {
          ({ subject, html } = buildEndOfDayEmail(appointment as Record<string, string>, userName, appUrl));
        }

        await sendEmail(userRow.email, subject, html);

        await adminClient.from("notification_logs").insert({
          user_id: userRow.id,
          notification_type: notificationType,
          appointment_id: appointment.id,
          recipient_email: userRow.email,
          status: "sent",
        });

        sent++;
      } catch (err) {
        errors.push(String(err));
        console.error("Error sending notification for appointment", appointment.id, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("trigger-daily-notifications error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
