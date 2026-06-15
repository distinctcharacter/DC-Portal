import { getSupabaseAdmin } from "./_shared/supabase-admin";
import { claimPurchasesForUser } from "./_shared/purchase-claim";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
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

function getAuthorizationHeader(headers: Record<string, string | undefined>) {
  return headers.Authorization ?? headers.authorization ?? "";
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const authorization = getAuthorizationHeader(event.headers);
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

    if (!token) {
      return jsonResponse(401, { error: "Missing authenticated portal session." });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return jsonResponse(401, { error: error?.message ?? "Invalid portal session." });
    }

    const result = await claimPurchasesForUser(admin, data.user);

    return jsonResponse(200, {
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase claim failed.";

    return jsonResponse(500, {
      ok: false,
      error: message
    });
  }
}

