import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "notifications@patyka.com";

  if (!apiKey) {
    console.log(`[FreelanceNotif] No RESEND_API_KEY — email would be sent to ${to}: ${subject}`);
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
    console.error(`[FreelanceNotif] Resend error for ${to}:`, error);
    throw new Error(`Failed to send email to ${to}: ${error}`);
  }

  console.log(`[FreelanceNotif] Email sent successfully to ${to}`);
}

function buildSubmittedApplicantEmail(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PATYKA - Inscription reçue</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${name},</p>
        <p>Nous avons bien reçu votre demande d'inscription en tant qu'animateur non salarié.</p>
        <p>Notre équipe RH va examiner votre dossier. Vous recevrez une réponse par email sous quelques jours ouvrés.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">L'équipe PATYKA</p>
      </div>
    </div>
  `;
}

function buildSubmittedHREmail(registration: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Nouvelle demande d'inscription</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Une nouvelle demande d'inscription animateur non salarié a été soumise :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Nom</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${registration.first_name} ${registration.last_name}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${registration.email}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Téléphone</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${registration.phone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">SIRET</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${registration.siret}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Première animation</td><td style="padding: 8px;">${registration.first_animation_date}</td></tr>
        </table>
        <p>Connectez-vous à Alkemia pour examiner la demande complète et valider ou refuser l'inscription.</p>
      </div>
    </div>
  `;
}

function buildApprovedEmail(name: string, userCode: string, countryCode: string, appUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PATYKA - Inscription validée</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${name},</p>
        <p>Votre demande d'inscription en tant qu'animateur non salarié a été <strong style="color: #16a34a;">validée</strong> !</p>
        <p>Pour finaliser votre inscription et créer votre mot de passe, veuillez utiliser les informations suivantes :</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Votre code :</strong> ${userCode}</p>
          <p style="margin: 0;"><strong>Pays :</strong> ${countryCode}</p>
        </div>
        <a href="${appUrl}/activate" style="display: inline-block; background: #0d9488; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 8px;">
          Activer mon compte
        </a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">L'équipe PATYKA</p>
      </div>
    </div>
  `;
}

function buildRejectedEmail(name: string, reason: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PATYKA - Demande d'inscription</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${name},</p>
        <p>Nous avons examiné votre demande d'inscription en tant qu'animateur non salarié.</p>
        <p>Malheureusement, nous ne pouvons pas donner suite à votre demande pour le motif suivant :</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #dc2626;">${reason}</p>
        </div>
        <p>N'hésitez pas à nous contacter pour plus d'informations.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">L'équipe PATYKA</p>
      </div>
    </div>
  `;
}

function buildRevisionRequestedEmail(name: string, rejectedDocs: { label: string; comment: string | null }[], revisionUrl: string): string {
  const docsList = rejectedDocs.map(d =>
    `<li style="margin-bottom: 8px;">
      <strong>${d.label}</strong>
      ${d.comment ? `<br/><span style="color: #dc2626; font-size: 13px;">Motif : ${d.comment}</span>` : ''}
    </li>`
  ).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PATYKA - Corrections demandées</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${name},</p>
        <p>Après examen de votre dossier d'inscription, certains documents nécessitent une correction :</p>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            ${docsList}
          </ul>
        </div>
        <p>Veuillez cliquer sur le bouton ci-dessous pour soumettre les documents corrigés :</p>
        <a href="${revisionUrl}" style="display: inline-block; background: #0d9488; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 8px;">
          Corriger ma demande
        </a>
        <p style="color: #64748b; font-size: 13px; margin-top: 16px;">Ce lien est valable 7 jours.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">L'équipe PATYKA</p>
      </div>
    </div>
  `;
}

function buildRevisionResubmittedHREmail(registration: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Dossier corrigé - À revoir</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Le candidat <strong>${registration.first_name} ${registration.last_name}</strong> a corrigé son dossier d'inscription.</p>
        <p>Les documents ont été mis à jour et sont prêts à être revus.</p>
        <p>Connectez-vous à Alkemia pour examiner les corrections.</p>
      </div>
    </div>
  `;
}

function buildPeriodicReminderEmail(name: string, documentType: string, expiresAt: string): string {
  const docLabel = documentType === 'urssaf_vigilance'
    ? "Attestation de vigilance URSSAF"
    : "Attestation de régularité fiscale";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PATYKA - Document à renouveler</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${name},</p>
        <p>Votre document <strong>${docLabel}</strong> arrive à expiration le <strong>${new Date(expiresAt).toLocaleDateString('fr-FR')}</strong>.</p>
        <p>Merci de soumettre un document à jour en vous connectant à votre espace Alkemia.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">L'équipe PATYKA</p>
      </div>
    </div>
  `;
}

const DOCUMENT_LABELS: Record<string, string> = {
  rib: "RIB",
  cv: "CV",
  id_card_front: "Pièce d'identité (recto)",
  id_card_back: "Pièce d'identité (verso)",
  kbis_or_rne: "Extrait Kbis / Attestation RNE",
  urssaf_vigilance: "Attestation de vigilance URSSAF",
  fiscal_regularity: "Attestation de régularité fiscale",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://alkemia.patyka.com";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, registrationId, documentId } = await req.json();

    switch (type) {
      case "registration_submitted": {
        const { data: registration } = await supabase
          .from("freelance_registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (!registration) throw new Error("Registration not found");

        await sendEmail(
          registration.email,
          "Votre demande d'inscription a été reçue",
          buildSubmittedApplicantEmail(`${registration.first_name} ${registration.last_name}`)
        );

        const { data: hrUsers } = await supabase
          .from("users")
          .select("email")
          .in("role", ["hr_manager", "super_admin"]);

        const { data: settings } = await supabase
          .from("admin_notification_settings")
          .select("notify_on_freelance_registration, additional_recipients");

        const notifyAdmins = (settings || []).some((s: any) => s.notify_on_freelance_registration);

        const recipients = new Set<string>();
        (hrUsers || []).forEach((u: any) => {
          if (u.email) recipients.add(u.email);
        });
        if (notifyAdmins) {
          for (const s of settings || []) {
            ((s as any).additional_recipients || []).forEach((e: string) => recipients.add(e));
          }
        }

        for (const email of recipients) {
          await sendEmail(
            email,
            `Nouvelle inscription freelance : ${registration.first_name} ${registration.last_name}`,
            buildSubmittedHREmail(registration)
          );
        }
        break;
      }

      case "registration_approved": {
        const { data: registration } = await supabase
          .from("freelance_registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (!registration) throw new Error("Registration not found");

        await sendEmail(
          registration.email,
          "Votre inscription a été validée - Activez votre compte",
          buildApprovedEmail(
            `${registration.first_name} ${registration.last_name}`,
            registration.user_code,
            registration.country_code,
            appUrl
          )
        );
        break;
      }

      case "registration_rejected": {
        const { data: registration } = await supabase
          .from("freelance_registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (!registration) throw new Error("Registration not found");

        await sendEmail(
          registration.email,
          "Votre demande d'inscription",
          buildRejectedEmail(
            `${registration.first_name} ${registration.last_name}`,
            registration.rejection_reason || "Aucun motif précisé"
          )
        );
        break;
      }

      case "revision_requested": {
        const { data: registration } = await supabase
          .from("freelance_registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (!registration) throw new Error("Registration not found");

        const { data: rejectedDocs } = await supabase
          .from("freelance_documents")
          .select("document_type, review_comment")
          .eq("registration_id", registrationId)
          .eq("review_status", "rejected");

        const { data: rejectedPeriodic } = await supabase
          .from("freelance_periodic_documents")
          .select("document_type, review_comment")
          .eq("registration_id", registrationId)
          .eq("review_status", "rejected");

        const allRejected = [
          ...(rejectedDocs || []).map((d: any) => ({
            label: DOCUMENT_LABELS[d.document_type] || d.document_type,
            comment: d.review_comment,
          })),
          ...(rejectedPeriodic || []).map((d: any) => ({
            label: DOCUMENT_LABELS[d.document_type] || d.document_type,
            comment: d.review_comment,
          })),
        ];

        const revisionUrl = `${appUrl}/freelance/revision/${registration.revision_token}`;

        await sendEmail(
          registration.email,
          "Corrections demandées sur votre dossier",
          buildRevisionRequestedEmail(
            `${registration.first_name} ${registration.last_name}`,
            allRejected,
            revisionUrl
          )
        );
        break;
      }

      case "revision_resubmitted": {
        const { data: registration } = await supabase
          .from("freelance_registrations")
          .select("*")
          .eq("id", registrationId)
          .single();

        if (!registration) throw new Error("Registration not found");

        const { data: hrUsers } = await supabase
          .from("users")
          .select("email")
          .in("role", ["hr_manager", "super_admin"]);

        for (const u of hrUsers || []) {
          if ((u as any).email) {
            await sendEmail(
              (u as any).email,
              `Dossier corrigé : ${registration.first_name} ${registration.last_name}`,
              buildRevisionResubmittedHREmail(registration)
            );
          }
        }
        break;
      }

      case "periodic_document_reminder": {
        const { data: doc } = await supabase
          .from("freelance_periodic_documents")
          .select("*, registration:freelance_registrations(first_name, last_name, email)")
          .eq("id", documentId)
          .single();

        if (!doc) throw new Error("Document not found");

        const reg = (doc as any).registration;
        if (reg?.email) {
          await sendEmail(
            reg.email,
            "Document à renouveler - PATYKA",
            buildPeriodicReminderEmail(
              `${reg.first_name} ${reg.last_name}`,
              doc.document_type,
              doc.expires_at
            )
          );

          await supabase
            .from("freelance_periodic_documents")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", documentId);
        }
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FreelanceNotif] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
