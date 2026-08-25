import { getSql } from "./neon";

const COMPLETION_CLOSEOUT_DAYS = 7;

export type EffectiveAccessRow = {
  entitlement_type: string;
  protocol_id: string | null;
  expires_at: string | null;
  grant_child_protocols: boolean;
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function earliestDate(dates: Date[]) {
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

export function accessEffectiveEndsAt(
  row: EffectiveAccessRow,
  progressByProtocol: Map<string, string | null>
) {
  const dates: Date[] = [];

  if (row.expires_at) dates.push(new Date(row.expires_at));

  if (row.protocol_id) {
    const completedAt = progressByProtocol.get(row.protocol_id);
    if (completedAt) dates.push(addDays(new Date(completedAt), COMPLETION_CLOSEOUT_DAYS));
  }

  return earliestDate(dates);
}

export function accessRowIsCurrentlyAvailable(
  row: EffectiveAccessRow,
  progressByProtocol: Map<string, string | null>
) {
  const endsAt = accessEffectiveEndsAt(row, progressByProtocol);
  return !endsAt || endsAt.getTime() > Date.now();
}

export async function getProgressByProtocol(userId: string) {
  const sql = getSql();
  const progressRows = (await sql`
    select protocol_id, completed_at
    from public.protocol_progress
    where user_id = ${userId}
  `) as Array<{ protocol_id: string; completed_at: string | null }>;

  return new Map(progressRows.map((row) => [row.protocol_id, row.completed_at]));
}

export async function getEffectiveAccessRows(userId: string, emailNormalized: string) {
  const sql = getSql();

  const entitlementRows = (await sql`
    select entitlement_type::text, protocol_id, expires_at,
           (entitlement_type = 'bundle') as grant_child_protocols
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
  `) as EffectiveAccessRow[];

  const woocommerceRows = (await sql`
    select wpm.entitlement_type::text, wpm.protocol_id,
           case
             when wpm.access_duration_days is null then null
             else p.purchased_at + (wpm.access_duration_days || ' days')::interval
           end as expires_at,
           wpm.grant_child_protocols
    from public.purchases p
    join public.woocommerce_product_mappings wpm
      on wpm.woocommerce_product_id = p.woocommerce_product_id
     and (
       wpm.woocommerce_variation_id is null
       or wpm.woocommerce_variation_id = p.woocommerce_variation_id
     )
    where p.email_normalized = ${emailNormalized}
      and wpm.active = true
  `) as EffectiveAccessRow[];

  const stripeRows = (await sql`
    select spm.entitlement_type::text, spm.protocol_id,
           case
             when spm.access_duration_days is null then null
             else p.purchased_at + (spm.access_duration_days || ' days')::interval
           end as expires_at,
           spm.grant_child_protocols
    from public.purchases p
    join public.stripe_product_mappings spm
      on (
        (p.stripe_price_id is not null and spm.stripe_price_id = p.stripe_price_id)
        or (
          p.stripe_price_id is null
          and p.stripe_product_id is not null
          and spm.stripe_product_id = p.stripe_product_id
        )
      )
    where p.email_normalized = ${emailNormalized}
      and spm.active = true
  `) as EffectiveAccessRow[];

  return [...entitlementRows, ...woocommerceRows, ...stripeRows];
}

export async function getAccessibleProtocolIds(userId: string, emailNormalized: string) {
  const sql = getSql();
  const progressByProtocol = await getProgressByProtocol(userId);
  const accessRows = (await getEffectiveAccessRows(userId, emailNormalized)).filter((row) =>
    accessRowIsCurrentlyAvailable(row, progressByProtocol)
  );
  const accessibleProtocolIds = new Set<string>();

  for (const row of accessRows) {
    if (row.protocol_id) accessibleProtocolIds.add(row.protocol_id);
  }

  const bundleProtocolIds = accessRows
    .filter((row) => (row.entitlement_type === "bundle" || row.grant_child_protocols) && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (bundleProtocolIds.length) {
    const childRows = await sql.query(
      "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[])",
      [bundleProtocolIds]
    );

    for (const child of childRows as Array<{ child_protocol_id: string }>) {
      if (child.child_protocol_id) accessibleProtocolIds.add(child.child_protocol_id);
    }
  }

  return Array.from(accessibleProtocolIds);
}

export async function userHasEffectiveProtocolAccess(
  userId: string,
  emailNormalized: string,
  protocolIds: string[]
) {
  if (!protocolIds.length) return false;
  const accessibleProtocolIds = await getAccessibleProtocolIds(userId, emailNormalized);
  return protocolIds.some((protocolId) => accessibleProtocolIds.includes(protocolId));
}
