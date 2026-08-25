import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
};

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY);
  const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!hasDatabaseUrl || !hasClerkSecret || !hasClerkPublishableKey) {
    return jsonResponse(500, {
      ok: false,
      stage: "environment",
      checks: {
        databaseUrl: hasDatabaseUrl,
        clerkSecretKey: hasClerkSecret,
        clerkPublishableKey: hasClerkPublishableKey
      }
    });
  }

  try {
    const sql = getSql();
    const rows = await sql`select now() as checked_at`;

    return jsonResponse(200, {
      ok: true,
      stage: "neon_clerk_ready",
      databaseReachable: true,
      checkedAt: rows[0]?.checked_at ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Healthcheck failed.";

    return jsonResponse(500, {
      ok: false,
      stage: "database_query",
      error: message
    });
  }
}
