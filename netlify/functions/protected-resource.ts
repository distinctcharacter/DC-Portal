import { createReadStream, existsSync } from "fs";
import { basename, join, resolve } from "path";
import { requirePortalUser } from "./_shared/clerk-auth";
import {
  getAccessibleProtocolIds,
  userHasEffectiveProtocolAccess
} from "./_shared/access-resolver";
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
    const accessibleProtocolIds = await getAccessibleProtocolIds(user.id, user.emailNormalized);
    const hasActivePortalEntitlement = isAdmin || accessibleProtocolIds.length > 0;
    const hasPractitionerLayerAccess = rule.practitionerOnly
      ? await userHasPractitionerLayerAccess(user.id, roles)
      : false;
    const hasProtocolAccess = rule.protocolIds
      ? await userHasEffectiveProtocolAccess(user.id, user.emailNormalized, rule.protocolIds)
      : false;

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
