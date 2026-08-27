import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

const TERMS_VERSION = "dc-portal-terms-v2-2025";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const sql = getSql();

    if (event.httpMethod === "GET") {
      const rows = await sql`
        select terms_version, terms_accepted_at
        from public.profiles
        where id = ${user.id}
        limit 1
      `;
      const profile = rows[0] as
        | { terms_version: string | null; terms_accepted_at: string | null }
        | undefined;

      return jsonResponse(200, {
        ok: true,
        accepted: profile?.terms_version === TERMS_VERSION,
        termsVersion: profile?.terms_version ?? null,
        acceptedAt: profile?.terms_accepted_at ?? null
      });
    }

    const acceptedAt = new Date().toISOString();
    const rows = await sql`
      update public.profiles
      set terms_version = ${TERMS_VERSION},
          terms_accepted_at = ${acceptedAt},
          updated_at = now()
      where id = ${user.id}
      returning terms_version, terms_accepted_at
    `;

    if (!rows.length) throw new Error("Terms acknowledgment could not be saved.");

    return jsonResponse(200, {
      ok: true,
      accepted: true,
      termsVersion: TERMS_VERSION,
      acceptedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terms acknowledgment could not be saved.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}

