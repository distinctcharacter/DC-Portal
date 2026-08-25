import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse, normalizeEmail } from "./_shared/neon";

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
  woocommerce_order_id: string | null;
  woocommerce_product_id: string | null;
  woocommerce_variation_id: string | null;
  amount_total: number | null;
  currency: string | null;
  purchased_at: string;
  claimed_at: string | null;
  email_verified_before_claim: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const DEFAULT_FOUNDER_EMAILS = ["stephanie@granitefieldholdings.com"];

function getNumberParam(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function founderEmails() {
  const configuredEmails = process.env.FOUNDER_ADMIN_EMAILS?.split(",") ?? DEFAULT_FOUNDER_EMAILS;
  return configuredEmails.map(normalizeEmail).filter(Boolean);
}

function isFounderEmail(email: string | null | undefined) {
  return founderEmails().includes(normalizeEmail(email));
}

async function assertAdmin(userId: string, email: string) {
  if (isFounderEmail(email)) return true;
  const sql = getSql();

  const profileRows = await sql`
    select primary_role
    from public.profiles
    where id = ${userId}
    limit 1
  `;
  const roleRows = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${userId}
  `;
  const roles = new Set([
    (profileRows[0] as { primary_role?: string } | undefined)?.primary_role,
    ...(roleRows as Array<{ role: string }>).map((row) => row.role)
  ]);

  return roles.has("admin");
}

function productNameFromPurchase(purchase: PurchaseRow) {
  const metadata = purchase.metadata ?? {};
  return (
    (typeof metadata.product_display_name === "string" && metadata.product_display_name) ||
    (typeof metadata.internal_product_key === "string" && metadata.internal_product_key) ||
    purchase.stripe_product_id ||
    purchase.woocommerce_product_id ||
    "Unmapped product"
  );
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const isAdmin = await assertAdmin(user.id, user.email);

    if (!isAdmin) {
      return jsonResponse(403, { error: "Founder access required." });
    }

    const sql = getSql();
    const limit = getNumberParam(event.queryStringParameters?.limit, 100, 250);
    const purchaseRows = (await sql`
      select id, user_id, email, source, stripe_product_id, stripe_price_id, woocommerce_order_id,
             woocommerce_product_id, woocommerce_variation_id, amount_total, currency, purchased_at,
             claimed_at, email_verified_before_claim, metadata, created_at
      from public.purchases
      order by purchased_at desc
      limit ${limit}
    `) as PurchaseRow[];

    const purchaseIds = purchaseRows.map((purchase) => purchase.id);
    const userIds = Array.from(new Set(purchaseRows.map((purchase) => purchase.user_id).filter(Boolean))) as string[];

    const entitlementRows = purchaseIds.length
      ? await sql.query(
          "select id, purchase_id, protocol_id, entitlement_type, status, created_at, expires_at from public.protocol_entitlements where purchase_id = any($1::uuid[])",
          [purchaseIds]
        )
      : [];
    const profileRows = userIds.length
      ? await sql.query(
          "select id, email, full_name, primary_role, last_login_at, created_at from public.profiles where id = any($1::text[])",
          [userIds]
        )
      : [];

    const entitlementsByPurchase = new Map<string, unknown[]>();
    for (const entitlement of entitlementRows as Array<{ purchase_id: string | null }>) {
      const purchaseId = entitlement.purchase_id;
      if (!purchaseId) continue;
      entitlementsByPurchase.set(purchaseId, [...(entitlementsByPurchase.get(purchaseId) ?? []), entitlement]);
    }

    const profilesById = new Map((profileRows as Array<{ id: string }>).map((profile) => [profile.id, profile]));
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
      woocommerceOrderId: purchase.woocommerce_order_id,
      woocommerceProductId: purchase.woocommerce_product_id,
      woocommerceVariationId: purchase.woocommerce_variation_id,
      profile: purchase.user_id ? profilesById.get(purchase.user_id) ?? null : null,
      entitlements: entitlementsByPurchase.get(purchase.id) ?? []
    }));

    const totalRevenue = purchaseRows.reduce((sum, purchase) => sum + (purchase.amount_total ?? 0), 0);
    const claimedOrders = purchaseRows.filter((purchase) => Boolean(purchase.claimed_at)).length;
    const unclaimedOrders = purchaseRows.length - claimedOrders;
    const webhookRows = await sql`
      select provider_event_id, event_type, processing_status, created_at, processed_at
      from public.webhook_events
      order by created_at desc
      limit 20
    `;

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
      recentWebhookEvents: webhookRows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Founder orders could not be loaded.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
