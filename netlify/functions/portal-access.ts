import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse, normalizeEmail } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

const ROLE_PRIORITY = ["admin", "practitioner", "license_holder", "client"];
const DEFAULT_FOUNDER_EMAILS = ["stephanie@granitefieldholdings.com"];
const COMPLETION_CLOSEOUT_DAYS = 7;

type EntitlementRow = {
  entitlement_type: string;
  protocol_id: string | null;
  expires_at: string | null;
};

type ProgressRow = {
  protocol_id: string;
  completed_at: string | null;
};

function primaryRole(roles: string[]) {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "client";
}

function founderEmails() {
  const configuredEmails = process.env.FOUNDER_ADMIN_EMAILS?.split(",") ?? DEFAULT_FOUNDER_EMAILS;
  return configuredEmails.map(normalizeEmail).filter(Boolean);
}

function isFounderEmail(email: string | null | undefined) {
  return founderEmails().includes(normalizeEmail(email));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function earliestDate(dates: Date[]) {
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function latestDate(dates: Date[]) {
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function entitlementEffectiveEndsAt(row: EntitlementRow, progressByProtocol: Map<string, string | null>) {
  const dates: Date[] = [];

  if (row.expires_at) dates.push(new Date(row.expires_at));

  if (row.protocol_id) {
    const completedAt = progressByProtocol.get(row.protocol_id);
    if (completedAt) dates.push(addDays(new Date(completedAt), COMPLETION_CLOSEOUT_DAYS));
  }

  return earliestDate(dates);
}

function entitlementIsCurrentlyAvailable(row: EntitlementRow, progressByProtocol: Map<string, string | null>) {
  const endsAt = entitlementEffectiveEndsAt(row, progressByProtocol);
  return !endsAt || endsAt.getTime() > Date.now();
}

async function expandedProtocolIds(entitlementRows: EntitlementRow[]) {
  const sql = getSql();
  const ids = new Set<string>();

  for (const row of entitlementRows) {
    if (row.protocol_id) ids.add(row.protocol_id);
  }

  const bundleProtocolIds = entitlementRows
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (!bundleProtocolIds.length) return Array.from(ids);

  const childRows = await sql.query(
    "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[])",
    [bundleProtocolIds]
  );

  for (const row of childRows as Array<{ child_protocol_id: string }>) {
    if (row.child_protocol_id) ids.add(row.child_protocol_id);
  }

  return Array.from(ids);
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const sql = getSql();
    const founderAdmin = isFounderEmail(user.email);

    const profileRows = await sql`
      select primary_role
      from public.profiles
      where id = ${user.id}
      limit 1
    `;

    const roleRows = await sql`
      select role
      from public.user_role_assignments
      where user_id = ${user.id}
    `;

    const profileRole = (profileRows[0] as { primary_role?: string } | undefined)?.primary_role;
    const roles = Array.from(
      new Set([
        "client",
        founderAdmin ? "admin" : null,
        profileRole === "dtc_client" ? "client" : profileRole,
        ...((roleRows as Array<{ role: string }>).map((row) =>
          row.role === "dtc_client" ? "client" : row.role
        ))
      ].filter(Boolean) as string[])
    );

    const entitlementRows = (await sql`
      select entitlement_type, protocol_id, expires_at
      from public.protocol_entitlements
      where user_id = ${user.id}
        and status = 'active'
    `) as EntitlementRow[];

    const progressRows = (await sql`
      select protocol_id, completed_at
      from public.protocol_progress
      where user_id = ${user.id}
    `) as ProgressRow[];

    const progressByProtocol = new Map(progressRows.map((row) => [row.protocol_id, row.completed_at]));
    const isAdmin = roles.includes("admin");
    const hasPractitionerRole = roles.includes("practitioner");
    const hasLicenseHolderRole = roles.includes("license_holder");
    const activeEntitlements = entitlementRows.filter((row) =>
      entitlementIsCurrentlyAvailable(row, progressByProtocol)
    );
    const entitlementEndDates = activeEntitlements
      .map((row) => entitlementEffectiveEndsAt(row, progressByProtocol))
      .filter(Boolean) as Date[];
    const activeAccessUntil = latestDate(entitlementEndDates);
    const hasPractitionerEntitlement = activeEntitlements.some(
      (row) => row.entitlement_type === "practitioner_layer"
    );
    const hasLicenseSeatEntitlement = activeEntitlements.some(
      (row) => row.entitlement_type === "license_seat"
    );

    const practitionerProfileRows = await sql`
      select access_status
      from public.practitioner_profiles
      where user_id = ${user.id}
        and access_status = 'active'
      limit 1
    `;

    const licenseRows = await sql`
      select lm.status as membership_status, lo.status as organization_status, lo.expires_at
      from public.license_memberships lm
      join public.license_organizations lo on lo.id = lm.organization_id
      where lm.user_id = ${user.id}
        and lm.status = 'active'
    `;

    const hasActiveLicenseMembership = (
      licenseRows as Array<{ membership_status: string; organization_status: string; expires_at: string | null }>
    ).some((row) => {
      if (row.membership_status !== "active" || row.organization_status !== "active") return false;
      return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
    });

    const canAccessPractitionerLayer =
      isAdmin ||
      (hasPractitionerRole && hasPractitionerEntitlement && Boolean(practitionerProfileRows.length));

    const canAccessLicenseLayer =
      isAdmin || (hasLicenseHolderRole && (hasLicenseSeatEntitlement || hasActiveLicenseMembership));
    const protocolIds = await expandedProtocolIds(activeEntitlements);

    return jsonResponse(200, {
      ok: true,
      role: primaryRole(roles),
      roles,
      protocolIds,
      canAccessPractitionerLayer,
      canAccessLicenseLayer,
      hasActivePortalAccess:
        isAdmin ||
        activeEntitlements.length > 0 ||
        canAccessPractitionerLayer ||
        canAccessLicenseLayer,
      activeAccessUntil: activeAccessUntil ? activeAccessUntil.toISOString() : null,
      activeEntitlementCount: activeEntitlements.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal access check failed.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
