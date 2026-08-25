import { createHmac, timingSafeEqual } from "crypto";
import { getSql, jsonResponse, normalizeEmail } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
};

type WooCommerceLineItem = {
  id?: number | string | null;
  name?: string | null;
  product_id?: number | string | null;
  variation_id?: number | string | null;
  sku?: string | null;
  total?: string | number | null;
  subtotal?: string | number | null;
};

type WooCommerceOrder = {
  id?: number | string | null;
  order_key?: string | null;
  status?: string | null;
  currency?: string | null;
  total?: string | number | null;
  date_paid_gmt?: string | null;
  date_paid?: string | null;
  date_created_gmt?: string | null;
  date_created?: string | null;
  billing?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  line_items?: WooCommerceLineItem[];
};

type MappingRow = {
  woocommerce_product_id: string;
  woocommerce_variation_id: string | null;
  woocommerce_sku: string | null;
  internal_product_key: string;
  product_display_name: string | null;
  entitlement_type: string;
  protocol_id: string | null;
  role_granted: string | null;
  access_duration_days: number | null;
  grant_child_protocols: boolean;
  mapping_metadata?: Record<string, unknown> | null;
};

function getHeader(headers: Record<string, string | undefined>, name: string) {
  const direct = headers[name];
  if (direct) return direct;

  const lowerName = name.toLowerCase();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return found?.[1] ?? "";
}

function getRawBody(event: FunctionEvent) {
  if (!event.body) return "";
  return event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
}

function stringId(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const asString = String(value).trim();
  return asString || null;
}

function toMinorCurrencyUnit(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function paidAt(order: WooCommerceOrder) {
  const value = order.date_paid_gmt ?? order.date_paid ?? order.date_created_gmt ?? order.date_created;
  if (!value) return new Date().toISOString();
  const parsed = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function verifyWooSignature(rawBody: string, signatureHeader: string, secret: string) {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function isPaidOrderStatus(status: string | null | undefined) {
  return status === "processing" || status === "completed";
}

function providerEventId(headers: Record<string, string | undefined>, order: WooCommerceOrder) {
  const deliveryId = getHeader(headers, "x-wc-webhook-delivery-id");
  const webhookId = getHeader(headers, "x-wc-webhook-id");
  const topic = getHeader(headers, "x-wc-webhook-topic") || "order.updated";
  const orderId = stringId(order.id) ?? "unknown-order";

  if (deliveryId) return `woocommerce:${deliveryId}`;
  return `woocommerce:${webhookId || "webhook"}:${topic}:${orderId}`;
}

async function recordWebhookReceived(eventId: string, eventType: string, payload: WooCommerceOrder) {
  const sql = getSql();
  const existing = await sql`
    select provider_event_id, processing_status
    from public.webhook_events
    where provider_event_id = ${eventId}
    limit 1
  `;

  if ((existing[0] as { processing_status?: string } | undefined)?.processing_status === "processed") {
    return "already_processed" as const;
  }

  if (!existing.length) {
    await sql`
      insert into public.webhook_events (
        provider,
        provider_event_id,
        event_type,
        processing_status,
        payload
      )
      values (
        'woocommerce',
        ${eventId},
        ${eventType},
        'received',
        ${JSON.stringify(payload)}::jsonb
      )
      on conflict (provider_event_id) do nothing
    `;
  }

  return "received" as const;
}

async function updateWebhookStatus(eventId: string, processingStatus: "processed" | "failed" | "ignored") {
  const sql = getSql();

  await sql`
    update public.webhook_events
    set processing_status = ${processingStatus},
        processed_at = now()
    where provider_event_id = ${eventId}
  `;
}

async function findMapping(lineItem: WooCommerceLineItem) {
  const sql = getSql();
  const productId = stringId(lineItem.product_id);
  const variationId = stringId(lineItem.variation_id);
  const sku = lineItem.sku?.trim() || null;

  if (productId && variationId && variationId !== "0") {
    const rows = await sql`
      select woocommerce_product_id, woocommerce_variation_id, woocommerce_sku, internal_product_key,
             product_display_name, entitlement_type, protocol_id, role_granted, access_duration_days,
             grant_child_protocols, mapping_metadata
      from public.woocommerce_product_mappings
      where woocommerce_product_id = ${productId}
        and woocommerce_variation_id = ${variationId}
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  if (productId) {
    const rows = await sql`
      select woocommerce_product_id, woocommerce_variation_id, woocommerce_sku, internal_product_key,
             product_display_name, entitlement_type, protocol_id, role_granted, access_duration_days,
             grant_child_protocols, mapping_metadata
      from public.woocommerce_product_mappings
      where woocommerce_product_id = ${productId}
        and woocommerce_variation_id is null
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  if (sku) {
    const rows = await sql`
      select woocommerce_product_id, woocommerce_variation_id, woocommerce_sku, internal_product_key,
             product_display_name, entitlement_type, protocol_id, role_granted, access_duration_days,
             grant_child_protocols, mapping_metadata
      from public.woocommerce_product_mappings
      where woocommerce_sku = ${sku}
        and active = true
      limit 1
    `;

    if (rows[0]) return rows[0] as MappingRow;
  }

  return null;
}

async function recordPurchase(
  eventId: string,
  order: WooCommerceOrder,
  lineItem: WooCommerceLineItem,
  mapping: MappingRow
) {
  const sql = getSql();
  const email = normalizeEmail(order.billing?.email);
  const orderId = stringId(order.id);
  const lineItemId = stringId(lineItem.id);

  if (!email) throw new Error("WooCommerce order did not include a billing email.");
  if (!orderId) throw new Error("WooCommerce order did not include an order ID.");
  if (!lineItemId) throw new Error("WooCommerce order line item did not include a line item ID.");

  const existing = await sql`
    select id
    from public.purchases
    where woocommerce_order_id = ${orderId}
      and woocommerce_line_item_id = ${lineItemId}
    limit 1
  `;

  if (existing[0]) return (existing[0] as { id: string }).id;

  const productId = stringId(lineItem.product_id);
  const variationId = stringId(lineItem.variation_id);
  const inserted = await sql`
    insert into public.purchases (
      email,
      source,
      woocommerce_order_id,
      woocommerce_order_key,
      woocommerce_product_id,
      woocommerce_variation_id,
      woocommerce_line_item_id,
      amount_total,
      currency,
      purchased_at,
      metadata
    )
    values (
      ${email},
      'woocommerce_checkout',
      ${orderId},
      ${order.order_key ?? null},
      ${productId},
      ${variationId && variationId !== "0" ? variationId : null},
      ${lineItemId},
      ${toMinorCurrencyUnit(lineItem.total ?? lineItem.subtotal ?? order.total)},
      ${order.currency?.toLowerCase() ?? null},
      ${paidAt(order)},
      ${JSON.stringify({
        provider: "woocommerce",
        woocommerce_event_id: eventId,
        woocommerce_order_status: order.status ?? null,
        woocommerce_line_item_name: lineItem.name ?? null,
        woocommerce_sku: lineItem.sku ?? null,
        internal_product_key: mapping.internal_product_key,
        product_display_name: mapping.product_display_name,
        entitlement_type: mapping.entitlement_type,
        protocol_id: mapping.protocol_id
      })}::jsonb
    )
    on conflict do nothing
    returning id
  `;

  return (inserted[0] as { id?: string } | undefined)?.id;
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod === "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const eventType = getHeader(event.headers, "x-wc-webhook-topic") || "order.updated";
  const rawBody = getRawBody(event);

  if (eventType.toLowerCase().includes("ping") || !rawBody.trim()) {
    return jsonResponse(200, {
      ok: true,
      status: "setup_ping_accepted"
    });
  }

  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return jsonResponse(500, { ok: false, error: "Missing WOOCOMMERCE_WEBHOOK_SECRET." });
  }

  const signature = getHeader(event.headers, "x-wc-webhook-signature");

  if (!verifyWooSignature(rawBody, signature, webhookSecret)) {
    console.warn(
      "woocommerce-webhook signature rejected",
      JSON.stringify({
        topic: eventType,
        hasSignature: Boolean(signature),
        bodyLength: rawBody.length
      })
    );

    return jsonResponse(200, {
      ok: true,
      status: "signature_rejected_not_processed"
    });
  }

  let order: WooCommerceOrder;

  try {
    order = JSON.parse(rawBody) as WooCommerceOrder;
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid WooCommerce payload." });
  }

  const eventId = providerEventId(event.headers, order);

  try {
    const receiptStatus = await recordWebhookReceived(eventId, eventType, order);

    if (receiptStatus === "already_processed") {
      return jsonResponse(200, { ok: true, status: "already_processed" });
    }

    if (!isPaidOrderStatus(order.status)) {
      await updateWebhookStatus(eventId, "ignored");
      return jsonResponse(200, { ok: true, status: "ignored", reason: "order_not_paid" });
    }

    const lineItems = order.line_items ?? [];
    const processed: Array<{ purchaseId: string | undefined; internalProductKey: string }> = [];
    const unmapped: Array<string | null> = [];

    for (const lineItem of lineItems) {
      const mapping = await findMapping(lineItem);

      if (!mapping) {
        unmapped.push(stringId(lineItem.product_id) ?? lineItem.sku ?? null);
        continue;
      }

      const purchaseId = await recordPurchase(eventId, order, lineItem, mapping);
      processed.push({
        purchaseId,
        internalProductKey: mapping.internal_product_key
      });
    }

    if (!processed.length) {
      await updateWebhookStatus(eventId, "failed");
      return jsonResponse(200, {
        ok: false,
        status: "unmapped_product",
        unmapped
      });
    }

    await updateWebhookStatus(eventId, "processed");

    return jsonResponse(200, {
      ok: true,
      status: "processed",
      processed,
      unmapped
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WooCommerce webhook processing failed.";

    try {
      await updateWebhookStatus(eventId, "failed");
    } catch {
      // Preserve original failure response.
    }

    console.error(
      "woocommerce-webhook failure",
      JSON.stringify({
        eventId,
        eventType,
        orderId: order.id,
        message
      })
    );

    return jsonResponse(500, {
      ok: false,
      status: "processing_error_logged",
      message
    });
  }
}

