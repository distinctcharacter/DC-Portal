import type { SupabaseClient, User } from "@supabase/supabase-js";

type DatabaseClient = SupabaseClient<any, "public", any>;

type PurchaseRow = {
  id: string;
  email: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
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

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

async function findMapping(admin: DatabaseClient, purchase: PurchaseRow) {
  if (purchase.stripe_price_id) {
    const { data, error } = await admin
      .from("stripe_product_mappings")
      .select(
        "internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted, access_duration_days, grant_child_protocols"
      )
      .eq("stripe_price_id", purchase.stripe_price_id)
      .eq("active", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as MappingRow;
  }

  if (!purchase.stripe_product_id) return null;

  const { data, error } = await admin
    .from("stripe_product_mappings")
    .select(
      "internal_product_key, product_display_name, entitlement_type, protocol_id, role_granted, access_duration_days, grant_child_protocols"
    )
    .eq("stripe_product_id", purchase.stripe_product_id)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data as MappingRow | null;
}

async function ensureRole(admin: DatabaseClient, userId: string, role: string | null) {
  if (!role) return;

  const { error } = await admin.from("user_role_assignments").upsert(
    {
      user_id: userId,
      role,
      granted_reason: "stripe_purchase"
    },
    {
      onConflict: "user_id,role"
    }
  );

  if (error) throw error;
}

async function hasExistingEntitlement(admin: DatabaseClient, userId: string, mapping: MappingRow) {
  let query = admin
    .from("protocol_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("entitlement_type", mapping.entitlement_type)
    .in("status", ["active", "pending"])
    .limit(1);

  query = mapping.protocol_id ? query.eq("protocol_id", mapping.protocol_id) : query.is("protocol_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data?.length);
}

async function ensureEntitlement(
  admin: DatabaseClient,
  userId: string,
  purchaseId: string,
  mapping: MappingRow
) {
  const exists = await hasExistingEntitlement(admin, userId, mapping);
  if (exists) return;

  const expiresAt = mapping.access_duration_days ? addDays(new Date(), mapping.access_duration_days) : null;

  const { error } = await admin.from("protocol_entitlements").insert({
    user_id: userId,
    entitlement_type: mapping.entitlement_type,
    protocol_id: mapping.protocol_id,
    purchase_id: purchaseId,
    source: "stripe_payment_link",
    status: "active",
    expires_at: expiresAt
  });

  if (error && error.code !== "23505") throw error;
}

async function markPurchaseClaimed(admin: DatabaseClient, purchaseId: string, userId: string) {
  const { error } = await admin
    .from("purchases")
    .update({
      user_id: userId,
      claimed_at: new Date().toISOString(),
      email_verified_before_claim: true
    })
    .eq("id", purchaseId)
    .is("user_id", null)
    .is("claimed_at", null);

  if (error) throw error;
}

export async function claimPurchasesForUser(admin: DatabaseClient, user: User): Promise<ClaimResult> {
  const email = normalizeEmail(user.email);

  if (!email) {
    return {
      claimedCount: 0,
      claimed: [],
      skipped: ["Authenticated session does not include an email address."]
    };
  }

  if (!user.email_confirmed_at) {
    return {
      claimedCount: 0,
      claimed: [],
      skipped: ["Email must be confirmed before purchases can be claimed."]
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
      last_login_at: new Date().toISOString()
    },
    {
      onConflict: "email_normalized"
    }
  );

  if (profileError) throw profileError;

  const { data: purchases, error: purchaseError } = await admin
    .from("purchases")
    .select("id, email, stripe_product_id, stripe_price_id")
    .eq("email_normalized", email)
    .is("user_id", null)
    .is("claimed_at", null);

  if (purchaseError) throw purchaseError;

  const result: ClaimResult = {
    claimedCount: 0,
    claimed: [],
    skipped: []
  };

  for (const purchase of (purchases ?? []) as PurchaseRow[]) {
    const mapping = await findMapping(admin, purchase);

    if (!mapping) {
      result.skipped.push(`No active mapping found for purchase ${purchase.id}.`);
      continue;
    }

    await ensureRole(admin, user.id, mapping.role_granted);
    await ensureEntitlement(admin, user.id, purchase.id, mapping);
    await markPurchaseClaimed(admin, purchase.id, user.id);

    result.claimedCount += 1;
    result.claimed.push(mapping.product_display_name ?? mapping.internal_product_key);
  }

  return result;
}

