import { createReadStream, existsSync } from "fs";
import { basename, join, resolve } from "path";
import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type AccessRule = {
  authenticated?: boolean;
  protocolIds?: string[];
  practitionerOnly?: boolean;
};

const RESOURCE_ROOT = resolve(process.cwd(), "protected-resources", "resources");
const COMPLETION_CLOSEOUT_DAYS = 7;

const RESOURCE_ACCESS: Record<string, AccessRule> = {
  "12-dimensions-wellness.pdf": { authenticated: true },
  "biological-infrastructure-companion.pdf": { authenticated: true },
  "body-signal-index.pdf": { authenticated: true },
  "distinct-character-framework-glossary.pdf": { authenticated: true },
  "nervous-system-governance-guide.pdf": { authenticated: true },
  "nsg-digestion-sleep-movement-recovery.pdf": { authenticated: true },
  "somatic-baseline-companion.pdf": { protocolIds: ["DC-P01-SBP"] },
  "somatic-baseline-protocol.pdf": { protocolIds: ["DC-P01-SBP"] },
  "ios1-companion.pdf": { protocolIds: ["DC-P02-IOS"] },
  "ios1-protocol.pdf": { protocolIds: ["DC-P02-IOS"] },
  "mes1-companion.pdf": { protocolIds: ["DC-P02-MES"] },
  "mes1-protocol.pdf": { protocolIds: ["DC-P02-MES"] },
  "ncs1-companion.pdf": { protocolIds: ["DC-P02-NCS"] },
  "ncs1-protocol.pdf": { protocolIds: ["DC-P02-NCS"] },
  "execution-architecture-companion.pdf": { protocolIds: ["DC-P03-EXE"] },
  "execution-architecture-protocol.pdf": { protocolIds: ["DC-P03-EXE"] },
  "authority-framework-protocol.pdf": { protocolIds: ["DC-P04-AUT"] },
  "internal-signal-calibration-protocol.pdf": { protocolIds: ["DC-P04-ISC"] },
  "30-day-sovereignty-reset-protocol.pdf": { protocolIds: ["DC-P05-SOV"] },
  "self-mastery-blueprint-protocol.pdf": { protocolIds: ["DC-P06-SMB"] },
  "self-mastery-blueprint-relapse-reentry-ledger.pdf": { protocolIds: ["DC-P06-SMB"] },
  "enterprise-ip-mastermind-resource-suite.pdf": { protocolIds: ["DC-P07-EIP"] },
  "enterprise-ip-mastermind-advisor-guide.pdf": { practitionerOnly: true }
};

function sanitizeFileName(value: string | undefined) {
  if (!value) return "";
  const fileName = basename(value);
  if (!fileName.endsWith(".pdf")) return "";
  return fileName;
}

function entitlementIsActive(row: { expires_at: string | null }) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function completedProtocolMap(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select protocol_id, completed_at
    from public.protocol_progress
    where user_id = ${userId}
  `;

  return new Map((rows as Array<{ protocol_id: string; completed_at: string | null }>).map((row) => [
    row.protocol_id,
    row.completed_at
  ]));
}

function completionCloseoutIsActive(protocolId: string | null, completedByProtocol: Map<string, string | null>) {
  if (!protocolId) return true;
  const completedAt = completedByProtocol.get(protocolId);
  if (!completedAt) return true;
  return addDays(new Date(completedAt), COMPLETION_CLOSEOUT_DAYS).getTime() > Date.now();
}

function entitlementCurrentlyAvailable(
  row: { protocol_id: string | null; expires_at: string | null },
  completedByProtocol: Map<string, string | null>
) {
  return entitlementIsActive(row) && completionCloseoutIsActive(row.protocol_id, completedByProtocol);
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function userRoles(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${userId}
  `;

  return (rows as Array<{ role: string }>).map((row) => row.role);
}

async function userHasProtocolAccess(userId: string, protocolIds: string[]) {
  if (!protocolIds.length) return false;
  const sql = getSql();

  const rows = await sql`
    select entitlement_type, protocol_id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
  `;

  const completedByProtocol = await completedProtocolMap(userId);
  const activeRows = (rows as Array<{ entitlement_type: string; protocol_id: string | null; expires_at: string | null }>).filter(
    (row) => entitlementCurrentlyAvailable(row, completedByProtocol)
  );

  if (activeRows.some((row) => row.protocol_id && protocolIds.includes(row.protocol_id))) return true;

  const bundleProtocolIds = activeRows
    .filter((row) => row.entitlement_type === "bundle" && row.protocol_id)
    .map((row) => row.protocol_id as string);

  if (!bundleProtocolIds.length) return false;

  const childRows = await sql.query(
    "select child_protocol_id from public.bundle_protocols where bundle_protocol_id = any($1::text[]) and child_protocol_id = any($2::text[]) limit 1",
    [bundleProtocolIds, protocolIds]
  );

  return Boolean(childRows.length);
}

async function userHasActivePortalEntitlement(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select id, protocol_id, expires_at
    from public.protocol_entitlements
    where user_id = ${userId}
      and status = 'active'
  `;

  const completedByProtocol = await completedProtocolMap(userId);

  return (rows as Array<{ protocol_id: string | null; expires_at: string | null }>).some((row) =>
    entitlementCurrentlyAvailable(row, completedByProtocol)
  );
}

async function userHasPractitionerLayerAccess(userId: string, roles: string[]) {
  if (roles.includes("admin")) return true;
  if (!roles.includes("practitioner")) return false;
  const sql = getSql();

  const rows = await sql`
    select pe.id
    from public.protocol_entitlements pe
    join public.practitioner_profiles pp on pp.user_id = pe.user_id
    where pe.user_id = ${userId}
      and pe.entitlement_type = 'practitioner_layer'
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and pp.access_status = 'active'
    limit 1
  `;

  return Boolean(rows.length);
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const fileName = sanitizeFileName(event.queryStringParameters?.file);
  const rule = fileName ? RESOURCE_ACCESS[fileName] : null;

  if (!fileName || !rule) {
    return jsonResponse(404, { error: "Resource not found." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const roles = await userRoles(user.id);
    const isAdmin = roles.includes("admin");
    const hasActivePortalEntitlement = isAdmin || (await userHasActivePortalEntitlement(user.id));
    const hasPractitionerLayerAccess = rule.practitionerOnly
      ? await userHasPractitionerLayerAccess(user.id, roles)
      : false;
    const hasProtocolAccess = rule.protocolIds ? await userHasProtocolAccess(user.id, rule.protocolIds) : false;

    const allowed =
      isAdmin ||
      Boolean(rule.authenticated && hasActivePortalEntitlement) ||
      Boolean(rule.protocolIds && hasProtocolAccess) ||
      Boolean(rule.practitionerOnly && hasPractitionerLayerAccess);

    if (!allowed) {
      return jsonResponse(403, { error: "This resource is not available for this account." });
    }

    const filePath = join(RESOURCE_ROOT, fileName);

    if (!filePath.startsWith(RESOURCE_ROOT) || !existsSync(filePath)) {
      return jsonResponse(404, { error: "Resource file not found." });
    }

    const body = await streamToBuffer(createReadStream(filePath));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store"
      },
      body: body.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resource access failed.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
