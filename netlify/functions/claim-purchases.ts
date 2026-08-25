import { requirePortalUser } from "./_shared/clerk-auth";
import { claimPurchasesForUser } from "./_shared/purchase-claim";
import { jsonResponse } from "./_shared/neon";

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
    const result = await claimPurchasesForUser(user);

    return jsonResponse(200, {
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase claim failed.";

    return jsonResponse(message === "Login required." ? 401 : 500, {
      ok: false,
      error: message
    });
  }
}
