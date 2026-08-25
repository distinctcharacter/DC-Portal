import { requirePortalUser } from "./_shared/clerk-auth";
import { getAccessibleProtocolIds } from "./_shared/access-resolver";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const sql = getSql();
    const accessibleProtocolIds = await getAccessibleProtocolIds(user.id, user.emailNormalized);

    const purchaseRows = await sql`
      select source, woocommerce_product_id, stripe_product_id, claimed_at
      from public.purchases
      where email_normalized = ${user.emailNormalized}
      order by created_at desc
      limit 10
    `;

    const entitlementRows = await sql`
      select entitlement_type, protocol_id, status, expires_at
      from public.protocol_entitlements
      where user_id = ${user.id}
      order by created_at desc
      limit 20
    `;

    return jsonResponse(200, {
      ok: true,
      email: user.emailNormalized,
      accessibleProtocolIds,
      purchaseCountForEmail: purchaseRows.length,
      purchases: purchaseRows,
      entitlementCountForAccount: entitlementRows.length,
      entitlements: entitlementRows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Access diagnostic failed.";
    return jsonResponse(message === "Login required." ? 401 : 500, { ok: false, error: message });
  }
}
