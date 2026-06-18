import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

type EntitlementRow = {
  entitlement_type: string;
  protocol_id: string | null;
};

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

async function expandedProtocolAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
) {
  const { data: entitlements, error } = await admin
    .from("protocol_entitlements")
    .select("entitlement_type, protocol_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;

  const accessibleProtocolIds = new Set<string>();
  const bundleProtocolIds = ((entitlements ?? []) as EntitlementRow[])
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  for (const entitlement of (entitlements ?? []) as EntitlementRow[]) {
    if (entitlement.protocol_id) accessibleProtocolIds.add(entitlement.protocol_id);
  }

  if (!bundleProtocolIds.length) return Array.from(accessibleProtocolIds);

  const { data: childRows, error: childError } = await admin
    .from("bundle_protocols")
    .select("child_protocol_id")
    .in("bundle_protocol_id", bundleProtocolIds);

  if (childError) throw childError;

  for (const child of childRows ?? []) {
    if (child.child_protocol_id) accessibleProtocolIds.add(child.child_protocol_id as string);
  }

  return Array.from(accessibleProtocolIds);
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = getAuthorizationHeader(event.headers);
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return jsonResponse(401, { error: "Login required." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return jsonResponse(401, { error: "Login required." });
    }

    const [
      protocolsResult,
      resourcesResult,
      progressResult,
      practiceLogsResult,
      accessIds
    ] = await Promise.all([
      admin
        .from("protocols")
        .select("id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description")
        .order("sequence_order", { ascending: true }),
      admin
        .from("resource_assets")
        .select("id, title, asset_type, protocol_id, public_path, audience, practitioner_only")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      admin
        .from("protocol_progress")
        .select("protocol_id, completion_percent, current_phase_key, last_activity_at")
        .eq("user_id", data.user.id),
      admin
        .from("practice_logs")
        .select("id, protocol_id, practice_key, state_before, state_after, context_note, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      expandedProtocolAccess(admin, data.user.id)
    ]);

    if (protocolsResult.error) throw protocolsResult.error;
    if (resourcesResult.error) throw resourcesResult.error;

    return jsonResponse(200, {
      ok: true,
      protocols: protocolsResult.data ?? [],
      resources: resourcesResult.data ?? [],
      progress: progressResult.error ? [] : progressResult.data ?? [],
      practiceLogs: practiceLogsResult.error ? [] : practiceLogsResult.data ?? [],
      accessibleProtocolIds: accessIds
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal catalog could not be loaded.";
    return jsonResponse(500, { error: message });
  }
}
