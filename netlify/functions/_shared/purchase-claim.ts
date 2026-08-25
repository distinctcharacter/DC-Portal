import { getSql, normalizeEmail } from "./neon";
import type { PortalUser } from "./clerk-auth";

type PurchaseRow = {
  id: string;
  email: string;
  source: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  woocommerce_product_id: string | null;
  woocommerce_variation_id: string | null;
};

type MappingRow = {
  internal_product_key: string;
  product_display_name: string | null;
  entitlement_type: string;
  protocol_id: string | null;
  role_granted: string | null;
  access_duration_days: number | null;
  grant_child_protocols: boolean;
};

type ClaimResult = {
  claimedCount: number;
  claimed: string[];
  skipped: string[];
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result.toISOString();
}

async function findMapping(purchase: PurchaseRow) {
  const sql = getSql();

  if (purchase.stripe_price_id) {
    const rows = await sql`
      select internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted,
             access_duration_days, grant_child_protocols
      from public.stripe_product_mappings
      where stripe_price_id = ${purchase.stripe_price_id}
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  if (purchase.stripe_product_id) {
    const rows = await sql`
      select internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted,
             access_duration_days, grant_child_protocols
      from public.stripe_product_mappings
      where stripe_product_id = ${purchase.stripe_product_id}
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  if (!purchase.woocommerce_product_id) return null;

  if (purchase.woocommerce_variation_id) {
    const rows = await sql`
      select internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted,
             access_duration_days, grant_child_protocols
      from public.woocommerce_product_mappings
      where woocommerce_product_id = ${purchase.woocommerce_product_id}
        and woocommerce_variation_id = ${purchase.woocommerce_variation_id}
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  const rows = await sql`
    select internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted,
           access_duration_days, grant_child_protocols
    from public.woocommerce_product_mappings
    where woocommerce_product_id = ${purchase.woocommerce_product_id}
      and woocommerce_variation_id is null
      and active = true
    limit 1
  `;

  return (rows[0] as MappingRow | undefined) ?? null;
}

async function ensureRole(userId: string, role: string | null) {
  if (!role) return;
  const sql = getSql();

  await sql`
    insert into public.user_role_assignments (user_id, role, granted_reason)
    values (${userId}, ${role}, 'purchase')
    on conflict (user_id, role) do nothing
  `;

  if (role === "practitioner") {
    await sql`
      insert into public.practitioner_profiles (
        user_id,
        access_status,
        purchased_access
      )
      values (
        ${userId},
        'active',
        true
      )
      on conflict (user_id)
      do update set
        access_status = 'active',
        purchased_access = true,
        updated_at = now()
    `;
  }
}

async function expireClosedEntitlementsFor(userId: string, entitlementType: string, protocolId: string | null) {
  const sql = getSql();
  const now = new Date();

  if (protocolId) {
    await sql`
      update public.protocol_entitlements
      set status = 'expired', updated_at = now()
      where user_id = ${userId}
        and entitlement_type = ${entitlementType}
        and protocol_id = ${protocolId}
        and status in ('active', 'pending')
        and expires_at <= ${now.toISOString()}
    `;
  } else {
    await sql`
      update public.protocol_entitlements
      set status = 'expired', updated_at = now()
      where user_id = ${userId}
        and entitlement_type = ${entitlementType}
        and protocol_id is null
        and status in ('active', 'pending')
        and expires_at <= ${now.toISOString()}
    `;
    return;
  }

  const progressRows = await sql`
    select completed_at
    from public.protocol_progress
    where user_id = ${userId}
      and protocol_id = ${protocolId}
    limit 1
  `;

  const completedAt = (progressRows[0] as { completed_at?: string | null } | undefined)?.completed_at;
  if (!completedAt) return;

  const closeoutCutoff = subtractDays(now, 7);
  if (new Date(completedAt).getTime() > new Date(closeoutCutoff).getTime()) return;

  await sql`
    update public.protocol_entitlements
    set status = 'expired', updated_at = now()
    where user_id = ${userId}
      and entitlement_type = ${entitlementType}
      and protocol_id = ${protocolId}
      and status in ('active', 'pending')
  `;
}

async function hasExistingEntitlementFor(userId: string, entitlementType: string, protocolId: string | null) {
  const sql = getSql();
  await expireClosedEntitlementsFor(userId, entitlementType, protocolId);

  const rows = protocolId
    ? await sql`
        select id
        from public.protocol_entitlements
        where user_id = ${userId}
          and entitlement_type = ${entitlementType}
          and protocol_id = ${protocolId}
          and status in ('active', 'pending')
        limit 1
      `
    : await sql`
        select id
        from public.protocol_entitlements
        where user_id = ${userId}
          and entitlement_type = ${entitlementType}
          and protocol_id is null
          and status in ('active', 'pending')
        limit 1
      `;

  return Boolean(rows.length);
}

async function ensureEntitlement(userId: string, purchaseId: string, source: string, mapping: MappingRow) {
  const exists = await hasExistingEntitlementFor(userId, mapping.entitlement_type, mapping.protocol_id);
  if (exists) return;

  const sql = getSql();
  const expiresAt = mapping.access_duration_days ? addDays(new Date(), mapping.access_duration_days) : null;

  await sql`
    insert into public.protocol_entitlements (
      user_id,
      entitlement_type,
      protocol_id,
      purchase_id,
      source,
      status,
      expires_at
    )
    values (
      ${userId},
      ${mapping.entitlement_type},
      ${mapping.protocol_id},
      ${purchaseId},
      ${source},
      'active',
      ${expiresAt}
    )
    on conflict do nothing
  `;
}

async function ensureProtocolEntitlement(
  userId: string,
  purchaseId: string,
  source: string,
  protocolId: string,
  expiresAt: string | null
) {
  const exists = await hasExistingEntitlementFor(userId, "protocol", protocolId);
  if (exists) return;

  const sql = getSql();

  await sql`
    insert into public.protocol_entitlements (
      user_id,
      entitlement_type,
      protocol_id,
      purchase_id,
      source,
      status,
      expires_at
    )
    values (
      ${userId},
      'protocol',
      ${protocolId},
      ${purchaseId},
      ${source},
      'active',
      ${expiresAt}
    )
    on conflict do nothing
  `;
}

async function ensureBundleChildEntitlements(userId: string, purchaseId: string, source: string, mapping: MappingRow) {
  if (!mapping.grant_child_protocols || !mapping.protocol_id) return;

  const sql = getSql();
  const childRows = await sql`
    select child_protocol_id
    from public.bundle_protocols
    where bundle_protocol_id = ${mapping.protocol_id}
  `;
  const expiresAt = mapping.access_duration_days ? addDays(new Date(), mapping.access_duration_days) : null;

  for (const child of childRows as Array<{ child_protocol_id: string }>) {
    await ensureProtocolEntitlement(userId, purchaseId, source, child.child_protocol_id, expiresAt);
  }
}

async function markPurchaseClaimed(purchaseId: string, userId: string) {
  const sql = getSql();

  await sql`
    update public.purchases
    set user_id = ${userId},
        claimed_at = now(),
        email_verified_before_claim = true
    where id = ${purchaseId}
      and user_id is null
      and claimed_at is null
  `;
}

export async function claimPurchasesForUser(user: PortalUser): Promise<ClaimResult> {
  const email = normalizeEmail(user.email);
  const sql = getSql();

  if (!email) {
    return {
      claimedCount: 0,
      claimed: [],
      skipped: ["Authenticated session does not include an email address."]
    };
  }

  const purchases = (await sql`
    select id, email, source, stripe_product_id, stripe_price_id, woocommerce_product_id,
           woocommerce_variation_id
    from public.purchases
    where email_normalized = ${email}
      and user_id is null
      and claimed_at is null
  `) as PurchaseRow[];

  const result: ClaimResult = {
    claimedCount: 0,
    claimed: [],
    skipped: []
  };

  for (const purchase of purchases) {
    const mapping = await findMapping(purchase);

    if (!mapping) {
      result.skipped.push(`No active mapping found for purchase ${purchase.id}.`);
      continue;
    }

    await ensureRole(user.id, mapping.role_granted);
    await ensureEntitlement(user.id, purchase.id, purchase.source, mapping);
    await ensureBundleChildEntitlements(user.id, purchase.id, purchase.source, mapping);
    await markPurchaseClaimed(purchase.id, user.id);

    result.claimedCount += 1;
    result.claimed.push(mapping.product_display_name ?? mapping.internal_product_key);
  }

  return result;
}
