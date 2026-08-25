import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

type EntitlementRow = {
  entitlement_type: string;
  protocol_id: string | null;
  expires_at: string | null;
};

const COMPLETION_CLOSEOUT_DAYS = 7;

function entitlementIsActive(row: { expires_at: string | null }) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function completionCloseoutIsActive(protocolId: string | null, completedByProtocol: Map<string, string | null>) {
  if (!protocolId) return true;
  const completedAt = completedByProtocol.get(protocolId);
  if (!completedAt) return true;
  return addDays(new Date(completedAt), COMPLETION_CLOSEOUT_DAYS).getTime() > Date.now();
}

async function expandedProtocolAccess(userId: string) {
  const sql = getSql();
  const entitlements = (await sql`
    select entitlement_type, protocol_id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
  `) as EntitlementRow[];

  const progressRows = (await sql`
    select protocol_id, completed_at
    from public.protocol_progress
    where user_id = ${userId}
  `) as Array<{ protocol_id: string; completed_at: string | null }>;

  const completedByProtocol = new Map(progressRows.map((row) => [row.protocol_id, row.completed_at]));
  const activeEntitlements = entitlements.filter(
    (row) => entitlementIsActive(row) && completionCloseoutIsActive(row.protocol_id, completedByProtocol)
  );
  const bundleProtocolIds = activeEntitlements
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);
  const accessibleProtocolIds = new Set<string>();

  for (const entitlement of activeEntitlements) {
    if (entitlement.protocol_id) accessibleProtocolIds.add(entitlement.protocol_id);
  }

  if (!bundleProtocolIds.length) return Array.from(accessibleProtocolIds);

  const childRows = await sql.query(
    "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[])",
    [bundleProtocolIds]
  );

  for (const child of childRows as Array<{ child_protocol_id: string }>) {
    if (child.child_protocol_id) accessibleProtocolIds.add(child.child_protocol_id);
  }

  return Array.from(accessibleProtocolIds);
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const sql = getSql();

    const [protocols, resources, progress, practiceLogs, accessIds] = await Promise.all([
      sql`
        select id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description
        from public.protocols
        order by sequence_order asc
      `,
      sql`
        select id, title, asset_type, protocol_id, public_path, audience, practitioner_only
        from public.resource_assets
        where active = true
        order by created_at asc
      `,
      sql`
        select protocol_id, completion_percent, current_phase_key, last_activity_at, completed_at
        from public.protocol_progress
        where user_id = ${user.id}
      `,
      sql`
        select id, protocol_id, practice_key, state_before, state_after, context_note, created_at
        from public.practice_logs
        where user_id = ${user.id}
        order by created_at desc
        limit 5
      `,
      expandedProtocolAccess(user.id)
    ]);

    return jsonResponse(200, {
      ok: true,
      protocols,
      resources,
      progress,
      practiceLogs,
      accessibleProtocolIds: accessIds
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal catalog could not be loaded.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
