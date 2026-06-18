import { createReadStream, existsSync } from "fs";
import { basename, join, resolve } from "path";
import { getSupabaseAdmin } from "./_shared/supabase-admin";

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
  "enterprise-ip-mastermind-resource-suite.pdf": { protocolIds: ["DC-P07-EIP"] },
  "enterprise-ip-mastermind-advisor-guide.pdf": { practitionerOnly: true }
};

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

async function userRoles(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.role as string);
}

async function userHasProtocolAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  protocolIds: string[]
) {
  if (!protocolIds.length) return false;

  const { data, error } = await admin
    .from("protocol_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("protocol_id", protocolIds)
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

async function userHasPractitionerLayerAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  roles: string[]
) {
  if (roles.includes("admin")) return true;
  if (!roles.includes("practitioner")) return false;

  const { data: entitlementRows, error: entitlementError } = await admin
    .from("protocol_entitlements")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("entitlement_type", "practitioner_layer")
    .eq("status", "active")
    .limit(1);

  if (entitlementError) throw entitlementError;

  const hasActiveEntitlement = (entitlementRows ?? []).some(
    (row) => !row.expires_at || new Date(row.expires_at as string).getTime() > Date.now()
  );

  if (!hasActiveEntitlement) return false;

  const { data: profileRows, error: profileError } = await admin
    .from("practitioner_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("access_status", "active")
    .limit(1);

  if (profileError) throw profileError;
  return Boolean(profileRows?.length);
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

    const roles = await userRoles(admin, data.user.id);
    const isAdmin = roles.includes("admin");
    const hasPractitionerLayerAccess = rule.practitionerOnly
      ? await userHasPractitionerLayerAccess(admin, data.user.id, roles)
      : false;
    const hasProtocolAccess = rule.protocolIds
      ? await userHasProtocolAccess(admin, data.user.id, rule.protocolIds)
      : false;

    const allowed =
      isAdmin ||
      Boolean(rule.authenticated && data.user.email_confirmed_at) ||
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
    return jsonResponse(500, { error: message });
  }
}
