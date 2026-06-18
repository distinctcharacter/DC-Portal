import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
};

const SOMATIC_BASELINE_PROTOCOL_ID = "DC-P01-SBP";

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function getAuthorizationHeader(headers: Record<string, string | undefined>) {
  return headers.Authorization ?? headers.authorization ?? "";
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseBody(body: string | null | undefined) {
  if (!body) return {};

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function ensureProfile(
  admin: ReturnType<typeof getSupabaseAdmin>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }
) {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("A verified email is required before saving protocol logs.");
  }

  const fullName =
    cleanText(user.user_metadata?.full_name, 160) ||
    cleanText(user.user_metadata?.name, 160) ||
    null;

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      last_login_at: new Date().toISOString()
    },
    {
      onConflict: "id"
    }
  );

  if (error) throw error;
}

async function userHasSomaticAccess(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: roleRows, error: roleError } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", userId);

  if (roleError) throw roleError;
  if ((roleRows ?? []).some((row) => row.role === "admin")) return true;

  const { data: directRows, error: directError } = await admin
    .from("protocol_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("protocol_id", SOMATIC_BASELINE_PROTOCOL_ID)
    .limit(1);

  if (directError) throw directError;
  if (directRows?.length) return true;

  const { data: bundleRows, error: bundleError } = await admin
    .from("protocol_entitlements")
    .select("protocol_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("entitlement_type", "bundle")
    .not("protocol_id", "is", null);

  if (bundleError) throw bundleError;

  const bundleProtocolIds = (bundleRows ?? [])
    .map((row) => row.protocol_id as string | null)
    .filter(Boolean) as string[];

  if (!bundleProtocolIds.length) return false;

  const { data: childRows, error: childError } = await admin
    .from("bundle_protocols")
    .select("child_protocol_id")
    .in("bundle_protocol_id", bundleProtocolIds)
    .eq("child_protocol_id", SOMATIC_BASELINE_PROTOCOL_ID)
    .limit(1);

  if (childError) throw childError;
  return Boolean(childRows?.length);
}

async function updateProtocolProgress(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const now = new Date().toISOString();
  const { data: existingRows, error: readError } = await admin
    .from("protocol_progress")
    .select("completion_percent")
    .eq("user_id", userId)
    .eq("protocol_id", SOMATIC_BASELINE_PROTOCOL_ID)
    .limit(1);

  if (readError) throw readError;

  const currentPercent = Number(existingRows?.[0]?.completion_percent ?? 0);

  const { error } = await admin.from("protocol_progress").upsert(
    {
      user_id: userId,
      protocol_id: SOMATIC_BASELINE_PROTOCOL_ID,
      completion_percent: Math.max(currentPercent, 20),
      current_phase_key: "biological-architecture",
      last_activity_at: now,
      updated_at: now
    },
    {
      onConflict: "user_id,protocol_id"
    }
  );

  if (error) throw error;
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = getAuthorizationHeader(event.headers);
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return jsonResponse(401, { error: "Login required." });
  }

  const payload = parseBody(event.body);
  const practiceKey = cleanText(payload.practiceKey, 80);
  const stateBefore = cleanText(payload.stateBefore, 80);
  const stateAfter = cleanText(payload.stateAfter, 80);
  const contextNote = cleanText(payload.contextNote, 900);

  if (!practiceKey || !stateBefore || !stateAfter || !contextNote) {
    return jsonResponse(400, { error: "Complete each log field before saving." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user || !data.user.email_confirmed_at) {
      return jsonResponse(401, { error: "Login required." });
    }

    await ensureProfile(admin, data.user);

    const hasAccess = await userHasSomaticAccess(admin, data.user.id);

    if (!hasAccess) {
      return jsonResponse(403, {
        error: "Somatic Baseline access is required before saving this log."
      });
    }

    const { error: insertError } = await admin.from("practice_logs").insert({
      user_id: data.user.id,
      protocol_id: SOMATIC_BASELINE_PROTOCOL_ID,
      practice_key: practiceKey,
      state_before: stateBefore,
      state_after: stateAfter,
      context_note: contextNote
    });

    if (insertError) throw insertError;

    await updateProtocolProgress(admin, data.user.id);

    return jsonResponse(200, {
      ok: true,
      message: "Practice log saved."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practice log could not be saved.";
    return jsonResponse(500, { error: message });
  }
}
