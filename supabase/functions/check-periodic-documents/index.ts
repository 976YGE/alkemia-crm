import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch all periodic documents that are not yet expired
    const { data: documents, error: fetchError } = await supabase
      .from("freelance_periodic_documents")
      .select("id, document_type, expires_at, reminder_sent_at, status, registration_id, user_id")
      .in("status", ["valid", "expiring_soon"]);

    if (fetchError) throw fetchError;

    let updatedCount = 0;
    let remindersCount = 0;

    for (const doc of documents || []) {
      const expiresAt = new Date(doc.expires_at);
      let newStatus = doc.status;

      // Determine new status
      if (expiresAt <= now) {
        newStatus = "expired";
      } else if (doc.document_type === "urssaf_vigilance" && expiresAt <= in14Days) {
        newStatus = "expiring_soon";
      } else if (doc.document_type === "fiscal_regularity" && expiresAt <= in30Days) {
        newStatus = "expiring_soon";
      }

      // Update status if changed
      if (newStatus !== doc.status) {
        await supabase
          .from("freelance_periodic_documents")
          .update({ status: newStatus, updated_at: now.toISOString() })
          .eq("id", doc.id);
        updatedCount++;
      }

      // Send reminder if expiring soon and not already reminded recently
      if (newStatus === "expiring_soon") {
        const shouldRemind = !doc.reminder_sent_at ||
          (now.getTime() - new Date(doc.reminder_sent_at).getTime() > 7 * 24 * 60 * 60 * 1000);

        if (shouldRemind) {
          try {
            const notifUrl = `${supabaseUrl}/functions/v1/send-freelance-notification`;
            await fetch(notifUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "periodic_document_reminder",
                documentId: doc.id,
              }),
            });
            remindersCount++;
          } catch (err) {
            console.error(`[PeriodicCheck] Failed to send reminder for doc ${doc.id}:`, err);
          }
        }
      }
    }

    // Also mark documents past their expiry as expired
    const { error: expireError } = await supabase
      .from("freelance_periodic_documents")
      .update({ status: "expired", updated_at: now.toISOString() })
      .lt("expires_at", now.toISOString())
      .neq("status", "expired");

    if (expireError) {
      console.error("[PeriodicCheck] Error marking expired docs:", expireError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        documents_checked: (documents || []).length,
        statuses_updated: updatedCount,
        reminders_sent: remindersCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PeriodicCheck] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
