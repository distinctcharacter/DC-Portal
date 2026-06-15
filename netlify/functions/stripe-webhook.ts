import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
};

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: CheckoutSession;
  };
};

type CheckoutSession = {
  id: string;
  object: "checkout.session";
  amount_total?: number | null;
  currency?: string | null;
  customer?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  invoice?: string | null;
  metadata?: Record<string, string> | null;
  mode?: string | null;
  payment_intent?: string | null;
  payment_link?: string | null;
  payment_status?: string | null;
};

type StripeLineItem = {
  id: string;
  price?: {
    id?: string;
    product?: string | { id?: string };
  } | null;
};

type StripeLineItemsResponse = {
  data: StripeLineItem[];
};

type MappingRow = {
  stripe_product_id: string;
  stripe_price_id: string | null;
  internal_product_key: string;
  product_display_name: string | null;
  entitlement_type: string;
  protocol_id: string | null;
  mapping_metadata?: Record<string, unknown> | null;
};

type WebhookFailureContext = {
  stage: string;
  stripeEventId?: string;
  stripeEventType?: string;
  checkoutSessionId?: string;
};

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown webhook processing error.";
}

class StripeLineItemLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeLineItemLookupError";
  }
}

function logWebhookError(context: WebhookFailureContext, error: unknown) {
  console.error(
    "stripe-webhook failure",
    JSON.stringify({
      ...context,
      message: getErrorMessage(error)
    })
  );
}

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

function parseStripeSignature(signatureHeader: string) {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  return {
    timestamp,
    signatures
  };
}

function safeCompareHex(expectedHex: string, actualHex: string) {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || !signatures.length) {
    return false;
  }

  const toleranceSeconds = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS ?? "300");
  const timestampSeconds = Number(timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);

  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return signatures.some((signature) => safeCompareHex(expected, signature));
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function getPaymentLinkId(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/plink_[A-Za-z0-9]+/);
  return match?.[0] ?? value;
}

function getProductId(lineItem: StripeLineItem) {
  const product = lineItem.price?.product;

  if (typeof product === "string") return product;
  return product?.id ?? null;
}

async function fetchStripeLineItems(sessionId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new StripeLineItemLookupError(`Stripe line item lookup failed: ${response.status} ${body}`);
  }

  return (await response.json()) as StripeLineItemsResponse;
}

async function findMapping(admin: ReturnType<typeof getSupabaseAdmin>, lineItems: StripeLineItem[]) {
  for (const lineItem of lineItems) {
    const priceId = lineItem.price?.id ?? null;
    const productId = getProductId(lineItem);

    if (priceId) {
      const { data, error } = await admin
        .from("stripe_product_mappings")
        .select("stripe_product_id, stripe_price_id, internal_product_key, product_display_name, entitlement_type, protocol_id, mapping_metadata")
        .eq("stripe_price_id", priceId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (data) return { mapping: data as MappingRow, priceId, productId };
    }

    if (productId) {
      const { data, error } = await admin
        .from("stripe_product_mappings")
        .select("stripe_product_id, stripe_price_id, internal_product_key, product_display_name, entitlement_type, protocol_id, mapping_metadata")
        .eq("stripe_product_id", productId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (data) return { mapping: data as MappingRow, priceId, productId };
    }
  }

  return null;
}

async function findMappingByPaymentLink(admin: ReturnType<typeof getSupabaseAdmin>, paymentLinkId: string | null) {
  if (!paymentLinkId) return null;

  const { data, error } = await admin
    .from("stripe_product_mappings")
    .select("stripe_product_id, stripe_price_id, internal_product_key, product_display_name, entitlement_type, protocol_id, mapping_metadata")
    .eq("active", true);

  if (error) throw error;

  const mapping = (data ?? []).find((row) => {
    const metadata = row.mapping_metadata as Record<string, unknown> | null;
    const storedId = getPaymentLinkId(typeof metadata?.stripe_payment_link_id === "string" ? metadata.stripe_payment_link_id : null);
    const storedUrlId = getPaymentLinkId(typeof metadata?.payment_link === "string" ? metadata.payment_link : null);
    return storedId === paymentLinkId || storedUrlId === paymentLinkId;
  });

  return mapping ? { mapping: mapping as MappingRow, priceId: mapping.stripe_price_id, productId: mapping.stripe_product_id } : null;
}

async function updateWebhookStatus(
  admin: ReturnType<typeof getSupabaseAdmin>,
  providerEventId: string,
  processingStatus: "processed" | "failed" | "ignored"
) {
  const { error } = await admin
    .from("webhook_events")
    .update({
      processing_status: processingStatus,
      processed_at: new Date().toISOString()
    })
    .eq("provider_event_id", providerEventId);

  if (error) throw error;
}

async function recordWebhookReceived(admin: ReturnType<typeof getSupabaseAdmin>, stripeEvent: StripeEvent) {
  const { data: existing, error: existingError } = await admin
    .from("webhook_events")
    .select("provider_event_id, processing_status")
    .eq("provider_event_id", stripeEvent.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.processing_status === "processed") {
    return "already_processed" as const;
  }

  if (!existing) {
    const { error } = await admin.from("webhook_events").insert({
      provider_event_id: stripeEvent.id,
      event_type: stripeEvent.type,
      processing_status: "received",
      payload: stripeEvent
    });

    if (error && error.code !== "23505") throw error;
  }

  return "received" as const;
}

async function recordPurchase(
  admin: ReturnType<typeof getSupabaseAdmin>,
  stripeEvent: StripeEvent,
  session: CheckoutSession,
  mapping: MappingRow,
  priceId: string | null,
  productId: string | null
) {
  const email = normalizeEmail(session.customer_details?.email ?? session.customer_email);

  if (!email) {
    throw new Error("Checkout session did not include a customer email.");
  }

  const { data: existing, error: existingError } = await admin
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing.id as string;

  const { data, error } = await admin
    .from("purchases")
    .insert({
      email,
      source: "stripe_payment_link",
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_invoice_id: typeof session.invoice === "string" ? session.invoice : null,
      stripe_product_id: productId ?? mapping.stripe_product_id,
      stripe_price_id: priceId ?? mapping.stripe_price_id,
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
      purchased_at: new Date().toISOString(),
      metadata: {
        stripe_event_id: stripeEvent.id,
        stripe_payment_link: session.payment_link ?? null,
        stripe_session_mode: session.mode ?? null,
        internal_product_key: mapping.internal_product_key,
        product_display_name: mapping.product_display_name,
        entitlement_type: mapping.entitlement_type,
        protocol_id: mapping.protocol_id
      }
    })
    .select("id")
    .single();

  if (error && error.code !== "23505") throw error;
  return data?.id as string | undefined;
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    logWebhookError({ stage: "environment" }, new Error("Missing STRIPE_WEBHOOK_SECRET."));
    return jsonResponse(500, { error: "Missing STRIPE_WEBHOOK_SECRET." });
  }

  const rawBody = getRawBody(event);
  const signature = getHeader(event.headers, "stripe-signature");

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return jsonResponse(400, { error: "Invalid Stripe signature." });
  }

  let stripeEvent: StripeEvent;

  try {
    stripeEvent = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return jsonResponse(400, { error: "Invalid Stripe event payload." });
  }

  try {
    const admin = getSupabaseAdmin();
    const receiptStatus = await recordWebhookReceived(admin, stripeEvent);

    if (receiptStatus === "already_processed") {
      return jsonResponse(200, { ok: true, status: "already_processed" });
    }

    if (stripeEvent.type !== "checkout.session.completed") {
      await updateWebhookStatus(admin, stripeEvent.id, "ignored");
      return jsonResponse(200, { ok: true, status: "ignored" });
    }

    const session = stripeEvent.data.object;

    if (session.object !== "checkout.session") {
      await updateWebhookStatus(admin, stripeEvent.id, "failed");
      return jsonResponse(200, { ok: false, status: "failed" });
    }

    if (session.payment_status !== "paid") {
      await updateWebhookStatus(admin, stripeEvent.id, "ignored");
      return jsonResponse(200, { ok: true, status: "ignored" });
    }

    let match = await findMappingByPaymentLink(admin, getPaymentLinkId(session.payment_link));

    if (!match) {
      let lineItems: StripeLineItemsResponse;

      try {
        lineItems = await fetchStripeLineItems(session.id);
      } catch (lineItemError) {
        if (lineItemError instanceof StripeLineItemLookupError) {
          logWebhookError(
            {
              stage: "stripe_line_item_lookup",
              stripeEventId: stripeEvent.id,
              stripeEventType: stripeEvent.type,
              checkoutSessionId: session.id
            },
            lineItemError
          );
          await updateWebhookStatus(admin, stripeEvent.id, "failed");
          return jsonResponse(200, {
            ok: true,
            status: "stripe_line_item_lookup_failed",
            message:
              "Webhook received, but Stripe line-item lookup failed. Check that STRIPE_SECRET_KEY belongs to the same Stripe mode as this webhook."
          });
        }

        throw lineItemError;
      }

      match = await findMapping(admin, lineItems.data);
    }

    if (!match) {
      await updateWebhookStatus(admin, stripeEvent.id, "failed");
      return jsonResponse(200, {
        ok: true,
        status: "unmapped_product",
        message: "Webhook received, but this Stripe test product is not mapped to a portal product."
      });
    }

    const purchaseId = await recordPurchase(
      admin,
      stripeEvent,
      session,
      match.mapping,
      match.priceId,
      match.productId
    );

    await updateWebhookStatus(admin, stripeEvent.id, "processed");

    return jsonResponse(200, {
      ok: true,
      status: "processed",
      purchaseId,
      internalProductKey: match.mapping.internal_product_key
    });
  } catch (error) {
    const message = getErrorMessage(error);

    logWebhookError(
      {
        stage: "processing",
        stripeEventId: stripeEvent.id,
        stripeEventType: stripeEvent.type,
        checkoutSessionId: stripeEvent.data.object.id
      },
      error
    );

    try {
      const admin = getSupabaseAdmin();
      await updateWebhookStatus(admin, stripeEvent.id, "failed");
    } catch (statusError) {
      logWebhookError(
        {
          stage: "status_update_failed",
          stripeEventId: stripeEvent.id,
          stripeEventType: stripeEvent.type,
          checkoutSessionId: stripeEvent.data.object.id
        },
        statusError
      );
      // Preserve the original failure response.
    }

    return jsonResponse(500, {
      ok: false,
      error: message
    });
  }
}
