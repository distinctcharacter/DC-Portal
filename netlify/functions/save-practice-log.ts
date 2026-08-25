import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
};

const SOMATIC_BASELINE_PROTOCOL_ID = "DC-P01-SBP";
const COMPLETION_CLOSEOUT_DAYS = 7;

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

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function protocolCompletionCloseoutIsActive(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select completed_at
    from public.protocol_progress
    where user_id = ${userId}
      and protocol_id = ${SOMATIC_BASELINE_PROTOCOL_ID}
    limit 1
  `;

  const completedAt = (rows[0] as { completed_at?: string | null } | undefined)?.completed_at;
  if (!completedAt) return true;

  return addDays(new Date(completedAt), COMPLETION_CLOSEOUT_DAYS).getTime() > Date.now();
}

function entitlementIsActive(row: { expires_at: string | null }) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

async function userHasSomaticAccess(userId: string) {
  const sql = getSql();

  const roleRows = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${userId}
  `;

  if ((roleRows as Array<{ role: string }>).some((row) => row.role === "admin")) return true;
  if (!(await protocolCompletionCloseoutIsActive(userId))) return false;

  const directRows = await sql`
    select id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
      and protocol_id = ${SOMATIC_BASELINE_PROTOCOL_ID}
  `;

  if ((directRows as Array<{ expires_at: string | null }>).some(entitlementIsActive)) return true;

  const bundleRows = (await sql`
    select protocol_id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
      and entitlement_type = 'bundle'
      and protocol_id is not null
  `) as Array<{ protocol_id: string; expires_at: string | null }>;

  const bundleProtocolIds = bundleRows.filter(entitlementIsActive).map((row) => row.protocol_id);
  if (!bundleProtocolIds.length) return false;

  const childRows = await sql.query(
    "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[]) and child_protocol_id = $2 limit 1",
    [bundleProtocolIds, SOMATIC_BASELINE_PROTOCOL_ID]
  );

  return Boolean(childRows.length);
}

async function updateProtocolProgress(userId: string) {
  const sql = getSql();
  const existingRows = await sql`
    select completion_percent
    from public.protocol_progress
    where user_id = ${userId}
      and protocol_id = ${SOMATIC_BASELINE_PROTOCOL_ID}
    limit 1
  `;

  const currentPercent = Number((existingRows[0] as { completion_percent?: number } | undefined)?.completion_percent ?? 0);

  await sql`
    insert into public.protocol_progress (
      user_id,
      protocol_id,
      completion_percent,
      current_phase_key,
      last_activity_at,
      updated_at
    )
    values (
      ${userId},
      ${SOMATIC_BASELINE_PROTOCOL_ID},
      ${Math.max(currentPercent, 20)},
      'biological-architecture',
      now(),
      now()
    )
    on conflict (user_id, protocol_id)
    do update set
      completion_percent = greatest(public.protocol_progress.completion_percent, excluded.completion_percent),
      current_phase_key = excluded.current_phase_key,
      last_activity_at = now(),
      updated_at = now()
  `;
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
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
    const user = await requirePortalUser(event.headers);
    const hasAccess = await userHasSomaticAccess(user.id);

    if (!hasAccess) {
      return jsonResponse(403, {
        error: "Somatic Baseline access is required before saving this log."
      });
    }

    const sql = getSql();

    await sql`
      insert into public.practice_logs (
        user_id,
        protocol_id,
        practice_key,
        state_before,
        state_after,
        context_note
      )
      values (
        ${user.id},
        ${SOMATIC_BASELINE_PROTOCOL_ID},
        ${practiceKey},
        ${stateBefore},
        ${stateAfter},
        ${contextNote}
      )
    `;

    await updateProtocolProgress(user.id);

    return jsonResponse(200, {
      ok: true,
      message: "Practice log saved."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practice log could not be saved.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
