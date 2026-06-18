import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

const ROLE_PRIORITY = ["admin", "practitioner", "license_holder", "client"];

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

function primaryRole(roles: string[]) {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "client";
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = getAuthorizationHeader(event.headers);
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return jsonResponse(401, { error: "Login required." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return jsonResponse(401, { error: "Login required." });
    }

    const { data: roleRows, error: roleError } = await admin
      .from("user_role_assignments")
      .select("role")
      .eq("user_id", data.user.id);

    if (roleError) throw roleError;

    const roles = Array.from(new Set(["client", ...((roleRows ?? []).map((row) => row.role as string))]));

    const { data: entitlementRows, error: entitlementError } = await admin
      .from("protocol_entitlements")
      .select("entitlement_type, protocol_id")
      .eq("user_id", data.user.id)
      .eq("status", "active");

    if (entitlementError) throw entitlementError;

    return jsonResponse(200, {
      ok: true,
      role: primaryRole(roles),
      roles,
      protocolIds: (entitlementRows ?? [])
        .map((row) => row.protocol_id as string | null)
        .filter(Boolean)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal access check failed.";
    return jsonResponse(500, { error: message });
  }
}
