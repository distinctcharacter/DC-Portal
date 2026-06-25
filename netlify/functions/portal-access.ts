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

function entitlementIsActive(row: { expires_at: string | null }) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

async function expandedProtocolIds(
  admin: ReturnType<typeof getSupabaseAdmin>,
  entitlementRows: Array<{ entitlement_type: string; protocol_id: string | null; expires_at: string | null }>
) {
  const activeEntitlements = entitlementRows.filter(entitlementIsActive);
  const ids = new Set<string>();

  for (const row of activeEntitlements) {
    if (row.protocol_id) ids.add(row.protocol_id);
  }

  const bundleProtocolIds = activeEntitlements
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (!bundleProtocolIds.length) return Array.from(ids);

  const { data, error } = await admin
    .from("bundle_protocols")
    .select("child_protocol_id")
    .in("bundle_protocol_id", bundleProtocolIds);

  if (error) throw error;

  for (const row of data ?? []) {
    if (row.child_protocol_id) ids.add(row.child_protocol_id as string);
  }

  return Array.from(ids);
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
      .select("entitlement_type, protocol_id, expires_at")
      .eq("user_id", data.user.id)
      .eq("status", "active");

    if (entitlementError) throw entitlementError;

    const isAdmin = roles.includes("admin");
    const hasPractitionerRole = roles.includes("practitioner");
    const hasLicenseHolderRole = roles.includes("license_holder");
    const activeEntitlements = (entitlementRows ?? []).filter((row) =>
      entitlementIsActive(row as { expires_at: string | null })
    );
    const hasPractitionerEntitlement = activeEntitlements.some(
      (row) => row.entitlement_type === "practitioner_layer"
    );
    const hasLicenseSeatEntitlement = activeEntitlements.some(
      (row) => row.entitlement_type === "license_seat"
    );

    const { data: practitionerProfileRows, error: practitionerProfileError } = await admin
      .from("practitioner_profiles")
      .select("access_status")
      .eq("user_id", data.user.id)
      .eq("access_status", "active")
      .limit(1);

    if (practitionerProfileError) throw practitionerProfileError;

    const { data: licenseRows, error: licenseError } = await admin
      .from("license_memberships")
      .select("status, license_organizations!inner(status, expires_at)")
      .eq("user_id", data.user.id)
      .eq("status", "active");

    if (licenseError) throw licenseError;

    const hasActiveLicenseMembership = (licenseRows ?? []).some((row) => {
      const organization = Array.isArray(row.license_organizations)
        ? row.license_organizations[0]
        : row.license_organizations;

      if (!organization || organization.status !== "active") return false;
      return !organization.expires_at || new Date(organization.expires_at).getTime() > Date.now();
    });

    const canAccessPractitionerLayer =
      isAdmin ||
      (hasPractitionerRole && hasPractitionerEntitlement && Boolean(practitionerProfileRows?.length));

    const canAccessLicenseLayer =
      isAdmin ||
      (hasLicenseHolderRole && (hasLicenseSeatEntitlement || hasActiveLicenseMembership));
    const protocolIds = await expandedProtocolIds(
      admin,
      (entitlementRows ?? []) as Array<{
        entitlement_type: string;
        protocol_id: string | null;
        expires_at: string | null;
      }>
    );

    return jsonResponse(200, {
      ok: true,
      role: primaryRole(roles),
      roles,
      protocolIds,
      canAccessPractitionerLayer,
      canAccessLicenseLayer
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal access check failed.";
    return jsonResponse(500, { error: message });
  }
}
