import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

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

async function userIsAdmin(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${userId}
      and role = 'admin'
    limit 1
  `;

  return Boolean(rows.length);
}

async function userHasProtocolAccess(userId: string, protocolId: string) {
  const sql = getSql();
  const entitlements = (await sql`
    select entitlement_type, protocol_id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
  `) as EntitlementRow[];

  const activeRows = entitlements.filter(entitlementIsActive);

  if (activeRows.some((row) => row.protocol_id === protocolId)) return true;

  const bundleProtocolIds = activeRows
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (!bundleProtocolIds.length) return false;

  const childRows = await sql.query(
    "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[]) and child_protocol_id = $2 limit 1",
    [bundleProtocolIds, protocolId]
  );

  return Boolean(childRows.length);
}

async function expireCompletedProtocolEntitlements(userId: string, protocolId: string, closeoutEndsAt: string) {
  const sql = getSql();
  const childRows = await sql`
    select child_protocol_id
    from public.bundle_protocols
    where bundle_protocol_id = ${protocolId}
  `;

  const protocolIds = [
    protocolId,
    ...((childRows as Array<{ child_protocol_id: string }>).map((row) => row.child_protocol_id).filter(Boolean))
  ];

  const entitlementRows = (await sql.query(
    "select id, expires_at from public.protocol_entitlements where user_id = $1 and protocol_id = any($2::text[]) and status = 'active'",
    [userId, protocolIds]
  )) as Array<{ id: string; expires_at: string | null }>;

  for (const row of entitlementRows) {
    const nextExpiresAt =
      row.expires_at && new Date(row.expires_at).getTime() < new Date(closeoutEndsAt).getTime()
        ? row.expires_at
        : closeoutEndsAt;

    await sql`
      update public.protocol_entitlements
      set expires_at = ${nextExpiresAt},
          updated_at = now()
      where id = ${row.id}
    `;
  }

  await sql.query(
    "update public.protocol_entitlements set expires_at = $1, updated_at = now() where user_id = $2 and protocol_id = any($3::text[]) and status = 'pending' and expires_at is null",
    [closeoutEndsAt, userId, protocolIds]
  );
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const protocolId = cleanProtocolId(parseBody(event.body).protocolId);

  if (!protocolId) {
    return jsonResponse(400, { error: "Protocol selection is required." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const isAdmin = await userIsAdmin(user.id);
    const hasAccess = isAdmin || (await userHasProtocolAccess(user.id, protocolId));

    if (!hasAccess) {
      return jsonResponse(403, { error: "This protocol is not active for this account." });
    }

    const sql = getSql();
    const existingProgress = await sql`
      select completed_at
      from public.protocol_progress
      where user_id = ${user.id}
        and protocol_id = ${protocolId}
      limit 1
    `;

    const completedAt = (existingProgress[0] as { completed_at?: string | null } | undefined)?.completed_at
      ? new Date((existingProgress[0] as { completed_at: string }).completed_at)
      : new Date();
    const closeoutEndsAt = addDays(completedAt, COMPLETION_CLOSEOUT_DAYS).toISOString();

    await sql`
      insert into public.protocol_progress (
        user_id,
        protocol_id,
        completion_percent,
        current_phase_key,
        last_activity_at,
        completed_at,
        updated_at
      )
      values (
        ${user.id},
        ${protocolId},
        100,
        'complete',
        now(),
        ${completedAt.toISOString()},
        now()
      )
      on conflict (user_id, protocol_id)
      do update set
        completion_percent = 100,
        current_phase_key = 'complete',
        last_activity_at = now(),
        completed_at = coalesce(public.protocol_progress.completed_at, excluded.completed_at),
        updated_at = now()
    `;

    if (!isAdmin) {
      await expireCompletedProtocolEntitlements(user.id, protocolId, closeoutEndsAt);
    }

    return jsonResponse(200, {
      ok: true,
      completedAt: completedAt.toISOString(),
      closeoutEndsAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Protocol completion could not be saved.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
