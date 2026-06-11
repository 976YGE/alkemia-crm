import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: "animator" | "hr_manager" | "admin" | "super_admin";
  countryCode: string;
  language?: string;
  userCodeId?: string | null;
  redirectTo?: string;
  resendInviteUserId?: string;
}

const ALLOWED_ROLES = ["animator", "hr_manager", "admin", "super_admin"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, message: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) {
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }

    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return jsonResponse(
        { success: false, message: "Accès refusé : droits administrateur requis" },
        403
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: CreateUserRequest = await req.json();

    if (body.resendInviteUserId) {
      const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(
        body.resendInviteUserId
      );
      if (targetErr || !target?.user?.email) {
        return jsonResponse({ success: false, message: "Utilisateur introuvable" }, 404);
      }

      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        target.user.email,
        body.redirectTo ? { redirectTo: body.redirectTo } : undefined
      );

      if (inviteErr) {
        return jsonResponse(
          { success: false, message: `Erreur d'envoi de l'invitation : ${inviteErr.message}` },
          400
        );
      }

      return jsonResponse({
        success: true,
        message: `Invitation renvoyée à ${target.user.email}`,
      });
    }

    const email = (body.email || "").trim().toLowerCase();
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const role = body.role;
    const countryCode = (body.countryCode || "").trim().toUpperCase();
    const language = (body.language || "fr").trim().toLowerCase();
    const userCodeId = body.userCodeId || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ success: false, message: "Email invalide" }, 400);
    }
    if (!firstName || !lastName) {
      return jsonResponse({ success: false, message: "Prénom et nom obligatoires" }, 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return jsonResponse({ success: false, message: "Rôle invalide" }, 400);
    }
    if (!countryCode) {
      return jsonResponse({ success: false, message: "Pays obligatoire" }, 400);
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile) {
      return jsonResponse(
        { success: false, message: "Un utilisateur avec cet email existe déjà" },
        409
      );
    }

    if (userCodeId) {
      const { data: codeRow, error: codeErr } = await supabaseAdmin
        .from("user_codes")
        .select("id, country_code")
        .eq("id", userCodeId)
        .maybeSingle();
      if (codeErr || !codeRow) {
        return jsonResponse({ success: false, message: "Code utilisateur introuvable" }, 400);
      }
      const { data: linkedProfile } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("user_code_id", userCodeId)
        .maybeSingle();
      if (linkedProfile) {
        return jsonResponse(
          { success: false, message: "Ce code utilisateur est déjà associé à un compte" },
          409
        );
      }
    }

    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          country_code: countryCode,
          preferred_language: language,
        },
        ...(body.redirectTo ? { redirectTo: body.redirectTo } : {}),
      }
    );

    if (inviteErr || !invited?.user) {
      return jsonResponse(
        {
          success: false,
          message: `Erreur lors de la création : ${inviteErr?.message ?? "inconnue"}`,
        },
        400
      );
    }

    const newUserId = invited.user.id;

    const { error: insertErr } = await supabaseAdmin.from("users").insert({
      id: newUserId,
      email,
      user_code_id: userCodeId,
      country_code: countryCode,
      preferred_language: language,
      role,
      created_by: caller.id,
      metadata: { first_name: firstName, last_name: lastName, created_via: "admin_invite" },
    });

    if (insertErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      return jsonResponse(
        {
          success: false,
          message: `Erreur lors de l'enregistrement du profil : ${insertErr.message}`,
        },
        400
      );
    }

    if (userCodeId) {
      await supabaseAdmin
        .from("user_codes")
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq("id", userCodeId);
    }

    return jsonResponse({
      success: true,
      message: `Invitation envoyée à ${email}`,
      userId: newUserId,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors de la création",
      },
      500
    );
  }
});
