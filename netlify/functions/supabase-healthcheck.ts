import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

const DEFAULT_FOUNDER_EMAILS = ["stephanie@granitefieldholdings.com"];

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

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function founderEmails() {
  const configuredEmails = process.env.FOUNDER_ADMIN_EMAILS?.split(",") ?? DEFAULT_FOUNDER_EMAILS;
  return configuredEmails.map(normalizeEmail).filter(Boolean);
}

function isFounderEmail(email: string | null | undefined) {
  return founderEmails().includes(normalizeEmail(email));
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
    const authorization = getAuthorizationHeader(event.headers);
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

    if (!token) {
      return jsonResponse(401, { ok: false, error: "Login required." });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);

    if (userError || !userData.user || !isFounderEmail(userData.user.email)) {
      return jsonResponse(403, { ok: false, error: "Founder access required." });
    }

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
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Supabase healthcheck error."
    });
  }
}
