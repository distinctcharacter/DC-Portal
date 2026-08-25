import { getAccessibleProtocolIds } from "./_shared/access-resolver";
import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse, normalizeEmail } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

type PurchaseRow = {
  id: string;
  user_id: string | null;
  email: string;
  email_normalized: string;
  source: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  woocommerce_order_id: string | null;
  woocommerce_product_id: string | null;
  woocommerce_variation_id: string | null;
  woocommerce_line_item_id: string | null;
  amount_total: number | null;
  currency: string | null;
  purchased_at: string;
  claimed_at: string | null;
  metadata: Record<string, unknown> | null;
};

type MappingRow = {
  woocommerce_product_id: string;
  woocommerce_variation_id: string | null;
  internal_product_key: string;
  product_display_name: string | null;
  entitlement_type: string;
  protocol_id: string | null;
  grant_child_protocols: boolean;
  active: boolean;
};

type WebhookRow = {
  provider_event_id: string;
  event_type: string;
  processing_status: string;
  created_at: string;
  processed_at: string | null;
  payload: Record<string, unknown> | null;
};

const DEFAULT_FOUNDER_EMAILS = ["stephanie@granitefieldholdings.com"];

function founderEmails() {
  const configuredEmails = process.env.FOUNDER_ADMIN_EMAILS?.split(",") ?? DEFAULT_FOUNDER_EMAILS;
  return configuredEmails.map(normalizeEmail).filter(Boolean);
}

function isFounderEmail(email: string | null | undefined) {
  return founderEmails().includes(normalizeEmail(email));
}

async function assertFounder(userId: string, email: string) {
  if (isFounderEmail(email)) return true;
  const sql = getSql();

  const roleRows = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${userId}
      and role = 'admin'
    limit 1
  `;

  return Boolean(roleRows.length);
}

function mappedPurchase(purchase: PurchaseRow, mappings: MappingRow[]) {
  if (!purchase.woocommerce_product_id) return null;
  return (
    mappings.find(
      (mapping) =>
        mapping.woocommerce_product_id === purchase.woocommerce_product_id &&
        (mapping.woocommerce_variation_id === purchase.woocommerce_variation_id ||
          mapping.woocommerce_variation_id === null)
    ) ?? null
  );
}

function lineItemProductIds(payload: Record<string, unknown> | null) {
  const lineItems = Array.isArray(payload?.line_items) ? payload.line_items : [];
  return lineItems
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const lineItem = item as Record<string, unknown>;
      return {
        productId: lineItem.product_id ? String(lineItem.product_id) : null,
        variationId: lineItem.variation_id ? String(lineItem.variation_id) : null,
        sku: lineItem.sku ? String(lineItem.sku) : null,
        name: lineItem.name ? String(lineItem.name) : null
      };
    })
    .filter(Boolean);
}

function webhookOrderId(event: WebhookRow) {
  const orderId = event.payload?.id;
  return orderId === null || orderId === undefined ? null : String(orderId);
}

function unresolvedWebhookRows(webhookRows: WebhookRow[], status: "failed" | "received") {
  return webhookRows.filter((event) => {
    if (event.processing_status !== status) return false;

    const orderId = webhookOrderId(event);
    if (!orderId) return true;

    return !webhookRows.some(
      (candidate) =>
        candidate.processing_status === "processed" &&
        webhookOrderId(candidate) === orderId &&
        new Date(candidate.created_at).getTime() >= new Date(event.created_at).getTime()
    );
  });
}

function buildFindings({
  purchaseRows,
  entitlementRows,
  mappings,
  webhookRows,
  accessibleProtocolIds
}: {
  purchaseRows: PurchaseRow[];
  entitlementRows: Array<{ protocol_id: string | null; entitlement_type: string; status: string }>;
  mappings: MappingRow[];
  webhookRows: WebhookRow[];
  accessibleProtocolIds: string[];
}) {
  const findings: Array<{ severity: "critical" | "warning" | "ok"; message: string }> = [];

  if (!mappings.length) {
    findings.push({
      severity: "critical",
      message: "No WooCommerce product mappings were found in the connected database."
    });
  }

  if (!purchaseRows.length) {
    findings.push({
      severity: "critical",
      message: "No purchase rows match the signed-in email. Access cannot unlock until a paid WooCommerce order is recorded with this email."
    });
  }

  const unmappedPurchases = purchaseRows.filter(
    (purchase) => purchase.source === "woocommerce_checkout" && !mappedPurchase(purchase, mappings)
  );
  if (unmappedPurchases.length) {
    findings.push({
      severity: "critical",
      message: `${unmappedPurchases.length} WooCommerce purchase row(s) do not match an active product mapping.`
    });
  }

  const failedWebhookRows = unresolvedWebhookRows(webhookRows, "failed");
  if (failedWebhookRows.length) {
    findings.push({
      severity: "warning",
      message: `${failedWebhookRows.length} recent WooCommerce webhook event(s) failed processing.`
    });
  }

  const receivedWebhookRows = unresolvedWebhookRows(webhookRows, "received");
  if (receivedWebhookRows.length) {
    findings.push({
      severity: "warning",
      message: `${receivedWebhookRows.length} recent WooCommerce webhook event(s) were received but not fully processed.`
    });
  }

  if (purchaseRows.length && !entitlementRows.length) {
    findings.push({
      severity: "warning",
      message: "Purchase rows exist for this email, but no entitlement rows are attached to this portal account yet."
    });
  }

  if (purchaseRows.length && !accessibleProtocolIds.length) {
    findings.push({
      severity: "critical",
      message: "Purchases exist for this email, but the access resolver returned zero active protocol IDs."
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "ok",
      message: "The signed-in account has matching purchase data and active protocol access."
    });
  }

  return findings;
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const isFounder = await assertFounder(user.id, user.email);

    if (!isFounder) {
      return jsonResponse(403, { error: "Founder access required." });
    }

    const sql = getSql();
    const [
      databaseRows,
      profileRows,
      roleRows,
      purchaseRows,
      entitlementRows,
      mappingRows,
      webhookRows,
      protocolRows,
      progressRows,
      accessibleProtocolIds
    ] = await Promise.all([
      sql`select current_database() as database_name, current_user as database_user`,
      sql`
        select id, clerk_user_id, email, email_normalized, primary_role, last_login_at
        from public.profiles
        where id = ${user.id}
        limit 1
      `,
      sql`
        select role, granted_reason, created_at
        from public.user_role_assignments
        where user_id = ${user.id}
        order by created_at desc
      `,
      sql`
        select id, user_id, email, email_normalized, source, stripe_product_id, stripe_price_id,
               woocommerce_order_id, woocommerce_product_id, woocommerce_variation_id,
               woocommerce_line_item_id, amount_total, currency, purchased_at, claimed_at, metadata
        from public.purchases
        where email_normalized = ${user.emailNormalized}
        order by purchased_at desc
        limit 25
      `,
      sql`
        select id, purchase_id, entitlement_type::text, protocol_id, status, expires_at, created_at
        from public.protocol_entitlements
        where user_id = ${user.id}
        order by created_at desc
        limit 50
      `,
      sql`
        select woocommerce_product_id, woocommerce_variation_id, internal_product_key,
               product_display_name, entitlement_type::text, protocol_id, grant_child_protocols, active
        from public.woocommerce_product_mappings
        order by internal_product_key asc
      `,
      sql`
        select provider_event_id, event_type, processing_status, created_at, processed_at, payload
        from public.webhook_events
        where provider = 'woocommerce'
        order by created_at desc
        limit 20
      `,
      sql`
        select id, slug, title, phase_label, status, sequence_order, parent_protocol_id
        from public.protocols
        order by sequence_order asc
      `,
      sql`
        select protocol_id, completion_percent, completed_at, last_activity_at
        from public.protocol_progress
        where user_id = ${user.id}
        order by updated_at desc
      `,
      getAccessibleProtocolIds(user.id, user.emailNormalized)
    ]);

    const purchases = purchaseRows as PurchaseRow[];
    const mappings = mappingRows as MappingRow[];
    const webhooks = webhookRows as WebhookRow[];
    const accessIds = accessibleProtocolIds as string[];

    return jsonResponse(200, {
      ok: true,
      checkedAt: new Date().toISOString(),
      environment: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasWooCommerceWebhookSecret: Boolean(process.env.WOOCOMMERCE_WEBHOOK_SECRET),
        hasClerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
        database: databaseRows[0] ?? null
      },
      signedInAccount: {
        id: user.id,
        email: user.email,
        emailNormalized: user.emailNormalized,
        profile: profileRows[0] ?? null,
        roles: roleRows
      },
      access: {
        accessibleProtocolIds: accessIds,
        entitlements: entitlementRows,
        progress: progressRows
      },
      purchaseMatching: {
        purchases,
        purchasesWithMapping: purchases.map((purchase) => ({
          purchase,
          mapping: mappedPurchase(purchase, mappings)
        }))
      },
      woocommerce: {
        mappings,
        recentWebhookEvents: webhooks.map((row) => ({
          ...row,
          orderStatus: typeof row.payload?.status === "string" ? row.payload.status : null,
          billingEmail:
            row.payload?.billing && typeof row.payload.billing === "object"
              ? ((row.payload.billing as Record<string, unknown>).email ?? null)
              : null,
          lineItems: lineItemProductIds(row.payload)
        }))
      },
      protocols: protocolRows,
      findings: buildFindings({
        purchaseRows: purchases,
        entitlementRows: entitlementRows as Array<{ protocol_id: string | null; entitlement_type: string; status: string }>,
        mappings,
        webhookRows: webhooks,
        accessibleProtocolIds: accessIds
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Founder system audit failed.";
    return jsonResponse(message === "Login required." ? 401 : 500, { ok: false, error: message });
  }
}
