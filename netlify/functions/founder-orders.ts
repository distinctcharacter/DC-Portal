import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type PurchaseRow = {
  id: string;
  user_id: string | null;
  email: string;
  source: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  amount_total: number | null;
  currency: string | null;
  purchased_at: string;
  claimed_at: string | null;
  email_verified_before_claim: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

function getNumberParam(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

async function assertAdmin(admin: ReturnType<typeof getSupabaseAdmin>, token: string) {
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false as const, statusCode: 401, userId: null, message: "Login required." };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("primary_role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const { data: roleRows, error: roleError } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) throw roleError;

  const roles = new Set([profile?.primary_role, ...(roleRows ?? []).map((row) => row.role)]);

  if (!roles.has("admin")) {
    return { ok: false as const, statusCode: 403, userId: data.user.id, message: "Founder access required." };
  }

  return { ok: true as const, userId: data.user.id };
}

function productNameFromPurchase(purchase: PurchaseRow) {
  const metadata = purchase.metadata ?? {};
  return (
    (typeof metadata.product_display_name === "string" && metadata.product_display_name) ||
    (typeof metadata.internal_product_key === "string" && metadata.internal_product_key) ||
    purchase.stripe_product_id ||
    "Unmapped product"
  );
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
    const adminCheck = await assertAdmin(admin, token);

    if (!adminCheck.ok) {
      return jsonResponse(adminCheck.statusCode, { error: adminCheck.message });
    }

    const limit = getNumberParam(event.queryStringParameters?.limit, 100, 250);

    const { data: purchases, error: purchaseError } = await admin
      .from("purchases")
      .select(
        "id, user_id, email, source, stripe_product_id, stripe_price_id, amount_total, currency, purchased_at, claimed_at, email_verified_before_claim, metadata, created_at"
      )
      .order("purchased_at", { ascending: false })
      .limit(limit);

    if (purchaseError) throw purchaseError;

    const purchaseRows = (purchases ?? []) as PurchaseRow[];
    const purchaseIds = purchaseRows.map((purchase) => purchase.id);
    const userIds = Array.from(new Set(purchaseRows.map((purchase) => purchase.user_id).filter(Boolean))) as string[];

    const [{ data: entitlementRows, error: entitlementError }, { data: profileRows, error: profileError }] =
      await Promise.all([
        purchaseIds.length
          ? admin
              .from("protocol_entitlements")
              .select("id, purchase_id, protocol_id, entitlement_type, status, created_at, expires_at")
              .in("purchase_id", purchaseIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? admin
              .from("profiles")
              .select("id, email, full_name, primary_role, last_login_at, created_at")
              .in("id", userIds)
          : Promise.resolve({ data: [], error: null })
      ]);

    if (entitlementError) throw entitlementError;
    if (profileError) throw profileError;

    const entitlementsByPurchase = new Map<string, unknown[]>();
    for (const entitlement of entitlementRows ?? []) {
      const purchaseId = entitlement.purchase_id as string | null;
      if (!purchaseId) continue;
      entitlementsByPurchase.set(purchaseId, [
        ...(entitlementsByPurchase.get(purchaseId) ?? []),
        entitlement
      ]);
    }

    const profilesById = new Map((profileRows ?? []).map((profile) => [profile.id as string, profile]));
    const orders = purchaseRows.map((purchase) => ({
      id: purchase.id,
      email: purchase.email,
      productName: productNameFromPurchase(purchase),
      amountTotal: purchase.amount_total,
      currency: purchase.currency,
      source: purchase.source,
      purchasedAt: purchase.purchased_at,
      claimedAt: purchase.claimed_at,
      emailVerifiedBeforeClaim: purchase.email_verified_before_claim,
      stripeProductId: purchase.stripe_product_id,
      stripePriceId: purchase.stripe_price_id,
      profile: purchase.user_id ? profilesById.get(purchase.user_id) ?? null : null,
      entitlements: entitlementsByPurchase.get(purchase.id) ?? []
    }));

    const totalRevenue = purchaseRows.reduce((sum, purchase) => sum + (purchase.amount_total ?? 0), 0);
    const claimedOrders = purchaseRows.filter((purchase) => Boolean(purchase.claimed_at)).length;
    const unclaimedOrders = purchaseRows.length - claimedOrders;

    const { data: webhookRows, error: webhookError } = await admin
      .from("webhook_events")
      .select("provider_event_id, event_type, processing_status, created_at, processed_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (webhookError) throw webhookError;

    return jsonResponse(200, {
      ok: true,
      summary: {
        totalOrders: purchaseRows.length,
        claimedOrders,
        unclaimedOrders,
        totalRevenue,
        currency: purchaseRows.find((purchase) => purchase.currency)?.currency ?? "usd",
        lastPurchaseAt: purchaseRows[0]?.purchased_at ?? null
      },
      orders,
      recentWebhookEvents: webhookRows ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Founder orders could not be loaded.";
    return jsonResponse(500, { error: message });
  }
}
