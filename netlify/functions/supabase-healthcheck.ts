import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
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

function stripeSecretMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";

  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  if (key) return "unknown";
  return "missing";
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("webhook_events").select("id").limit(1);

    if (error) {
      return jsonResponse(200, {
        ok: false,
        stage: "supabase_query",
        error: error.message
      });
    }

    return jsonResponse(200, {
      ok: true,
      stage: "supabase_query",
      webhookEventRowsVisible: data?.length ?? 0,
      stripeSecretMode: stripeSecretMode(),
      stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET)
    });
  } catch (error) {
    return jsonResponse(200, {
      ok: false,
      stage: "environment_or_client",
      error: error instanceof Error ? error.message : "Unknown Supabase healthcheck error.",
      stripeSecretMode: stripeSecretMode(),
      stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET)
    });
  }
}
