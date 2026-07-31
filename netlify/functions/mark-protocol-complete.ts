import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
};

type EntitlementRow = {
  entitlement_type: string;
  protocol_id: string | null;
  expires_at: string | null;
};

const COMPLETION_CLOSEOUT_DAYS = 7;

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

function parseBody(body: string | null | undefined) {
  if (!body) return {};

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanProtocolId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 40);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function entitlementIsActive(row: EntitlementRow) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

async function userIsAdmin(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).some((row) => row.role === "admin");
}

async function userHasProtocolAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  protocolId: string
) {
  const { data, error } = await admin
    .from("protocol_entitlements")
    .select("entitlement_type, protocol_id, expires_at")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;

  const activeRows = ((data ?? []) as EntitlementRow[]).filter(entitlementIsActive);

  if (activeRows.some((row) => row.protocol_id === protocolId)) {
    return true;
  }

  const bundleProtocolIds = activeRows
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (!bundleProtocolIds.length) return false;

  const { data: childRows, error: childError } = await admin
    .from("bundle_protocols")
    .select("child_protocol_id")
    .in("bundle_protocol_id", bundleProtocolIds)
    .eq("child_protocol_id", protocolId)
    .limit(1);

  if (childError) throw childError;
  return Boolean(childRows?.length);
}

async function expireCompletedProtocolEntitlements(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  protocolId: string,
  closeoutEndsAt: string
) {
  const { data: childRows, error: childError } = await admin
    .from("bundle_protocols")
    .select("child_protocol_id")
    .eq("bundle_protocol_id", protocolId);

  if (childError) throw childError;

  const protocolIds = [
    protocolId,
    ...((childRows ?? []).map((row) => row.child_protocol_id as string).filter(Boolean))
  ];

  const { data: entitlementRows, error: readError } = await admin
    .from("protocol_entitlements")
    .select("id, expires_at")
    .eq("user_id", userId)
    .in("protocol_id", protocolIds)
    .eq("status", "active");

  if (readError) throw readError;

  for (const row of entitlementRows ?? []) {
    const existingExpiresAt = row.expires_at as string | null;
    const nextExpiresAt =
      existingExpiresAt && new Date(existingExpiresAt).getTime() < new Date(closeoutEndsAt).getTime()
        ? existingExpiresAt
        : closeoutEndsAt;

    const { error } = await admin
      .from("protocol_entitlements")
      .update({
        expires_at: nextExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id as string);

    if (error) throw error;
  }

  const { error } = await admin
    .from("protocol_entitlements")
    .update({
      expires_at: closeoutEndsAt,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .in("protocol_id", protocolIds)
    .eq("status", "pending")
    .is("expires_at", null);

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

  const protocolId = cleanProtocolId(parseBody(event.body).protocolId);

  if (!protocolId) {
    return jsonResponse(400, { error: "Protocol selection is required." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user || !data.user.email_confirmed_at) {
      return jsonResponse(401, { error: "Login required." });
    }

    const isAdmin = await userIsAdmin(admin, data.user.id);
    const hasAccess = isAdmin || (await userHasProtocolAccess(admin, data.user.id, protocolId));

    if (!hasAccess) {
      return jsonResponse(403, { error: "This protocol is not active for this account." });
    }

    const { data: existingProgress, error: existingError } = await admin
      .from("protocol_progress")
      .select("completed_at")
      .eq("user_id", data.user.id)
      .eq("protocol_id", protocolId)
      .maybeSingle();

    if (existingError) throw existingError;

    const completedAt = existingProgress?.completed_at
      ? new Date(existingProgress.completed_at as string)
      : new Date();
    const closeoutEndsAt = addDays(completedAt, COMPLETION_CLOSEOUT_DAYS).toISOString();

    const { error: progressError } = await admin.from("protocol_progress").upsert(
      {
        user_id: data.user.id,
        protocol_id: protocolId,
        completion_percent: 100,
        current_phase_key: "complete",
        last_activity_at: new Date().toISOString(),
        completed_at: completedAt.toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id,protocol_id"
      }
    );

    if (progressError) throw progressError;

    if (!isAdmin) {
      await expireCompletedProtocolEntitlements(admin, data.user.id, protocolId, closeoutEndsAt);
    }

    return jsonResponse(200, {
      ok: true,
      completedAt: completedAt.toISOString(),
      closeoutEndsAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Protocol completion could not be saved.";
    return jsonResponse(500, { error: message });
  }
}
