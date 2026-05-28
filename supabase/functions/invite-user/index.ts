import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Authenticate the caller ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return ok({ error: "Missing authorization header" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";

    // Client scoped to the caller's JWT (respects RLS)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return ok({
        error:
          "Sesión inválida. Volvé a iniciar sesión. (" +
          (callerError?.message || "no user") +
          ")",
      });
    }

    // Admin-only client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an Admin via perfiles table
    const { data: callerPerfil, error: perfilError } = await adminClient
      .from("perfiles")
      .select("rol")
      .eq("id", caller.id)
      .single();

    if (perfilError || callerPerfil?.rol !== "Admin") {
      return ok({
        error:
          "Solo administradores pueden invitar usuarios (tu email: " +
          caller.email +
          ", rol: " +
          (callerPerfil?.rol || "sin perfil") +
          ")",
      });
    }

    // ── Parse request body ───────────────────────────────────
    const { email, role, permissions, invitedBy } = await req.json();

    if (!email || !role) {
      return ok({ error: "Email y rol son requeridos" });
    }

    // ── Generate invite link (does NOT send email) ───────────
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { rol: role },
          redirectTo: `${siteUrl}/auth/set-password`,
        },
      });

    let inviteUrl: string | null = null;

    if (linkError) {
      // If the user already exists, skip link generation but still update permissions
      if (!linkError.message?.includes("already been registered")) {
        return ok({ error: "Error al generar invitación: " + linkError.message });
      }
    } else {
      // Put the token in the hash fragment so WhatsApp/Telegram crawlers can't
      // consume the one-time token before the user clicks it.
      const hashedToken = linkData?.properties?.hashed_token;
      if (hashedToken) {
        inviteUrl = `${siteUrl}/auth/confirm#type=invite&token_hash=${hashedToken}`;
      } else {
        inviteUrl = linkData?.properties?.action_link ?? null;
      }
    }

    // ── Upsert user_permissions ──────────────────────────────
    const permRow: Record<string, unknown> = {
      email: email.toLowerCase(),
      role,
      can_manage_electores: permissions?.can_manage_electores ?? false,
      can_access_gastos: permissions?.can_access_gastos ?? false,
      can_access_lista: permissions?.can_access_lista ?? false,
      can_access_eventos: permissions?.can_access_eventos ?? false,
      can_access_campanas: permissions?.can_access_campanas ?? false,
      invited_at: new Date().toISOString(),
      invited_by: invitedBy ?? null,
      accepted_at: null,
    };

    const { error: upsertErr } = await adminClient
      .from("user_permissions")
      .upsert(permRow, { onConflict: "email" });

    if (upsertErr) {
      // Fallback: try update then insert
      const { data: existing } = await adminClient
        .from("user_permissions")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existing) {
        const { email: _e, ...updates } = permRow;
        const { error: updateErr } = await adminClient
          .from("user_permissions")
          .update(updates)
          .eq("email", email.toLowerCase());
        if (updateErr) {
          return ok({ error: "Error al guardar permisos: " + updateErr.message });
        }
      } else {
        const { error: insertErr } = await adminClient
          .from("user_permissions")
          .insert(permRow);
        if (insertErr) {
          return ok({ error: "Error al guardar permisos: " + insertErr.message });
        }
      }
    }

    return ok({
      message: "Invitación generada correctamente",
      inviteUrl,
    });
  } catch (err) {
    return ok({ error: "Error inesperado: " + (err as Error).message });
  }
});
