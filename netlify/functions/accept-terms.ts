import { requirePortalUser } from "./_shared/clerk-auth";
import { jsonResponse } from "./_shared/neon";

const TERMS_VERSION = "dc-portal-terms-v2-2025";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) throw new Error("Portal authentication is not configured.");

    const lookup = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(user.clerkUserId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    if (!lookup.ok) throw new Error("Terms acknowledgment could not be saved.");

    const clerkUser = (await lookup.json()) as { public_metadata?: Record<string, unknown> };
    const update = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(user.clerkUserId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          public_metadata: {
            ...(clerkUser.public_metadata ?? {}),
            dc_terms_version: TERMS_VERSION,
            dc_terms_accepted_at: new Date().toISOString()
          }
        })
      }
    );

    if (!update.ok) throw new Error("Terms acknowledgment could not be saved.");

    return jsonResponse(200, { ok: true, termsVersion: TERMS_VERSION });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terms acknowledgment could not be saved.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}

