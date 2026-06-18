import {
  userHasPractitionerLayerAccess,
  userRoles
} from "./_shared/practitioner-access";
import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
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

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseBody(body: string | null | undefined) {
  if (!body) return {};

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = getAuthorizationHeader(event.headers);
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return jsonResponse(401, { error: "Login required." });
  }

  const payload = parseBody(event.body);
  const relationshipId = cleanText(payload.relationshipId, 80);
  const noteType = cleanText(payload.noteType, 80);
  const visibility = cleanText(payload.visibility, 80) || "practitioner_only";
  const body = cleanText(payload.body, 3000);

  if (!relationshipId || !noteType || !body) {
    return jsonResponse(400, { error: "Complete the note fields before saving." });
  }

  if (!["practitioner_only", "shared_with_client", "admin_review"].includes(visibility)) {
    return jsonResponse(400, { error: "Select a valid note visibility." });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return jsonResponse(401, { error: "Login required." });
    }

    const roles = await userRoles(admin, data.user.id);
    const hasAccess = await userHasPractitionerLayerAccess(admin, data.user.id, roles);

    if (!hasAccess) {
      return jsonResponse(403, { error: "Practitioner access is required." });
    }

    const { data: relationship, error: relationshipError } = await admin
      .from("practitioner_client_relationships")
      .select("client_id, protocol_id")
      .eq("id", relationshipId)
      .eq("practitioner_id", data.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (relationshipError) throw relationshipError;

    if (!relationship) {
      return jsonResponse(403, { error: "This client is not assigned to this practitioner account." });
    }

    const { error: insertError } = await admin.from("practitioner_notes").insert({
      practitioner_id: data.user.id,
      client_id: relationship.client_id,
      protocol_id: relationship.protocol_id,
      note_type: noteType,
      visibility,
      body
    });

    if (insertError) throw insertError;

    return jsonResponse(200, {
      ok: true,
      message: "Practitioner note saved."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practitioner note could not be saved.";
    return jsonResponse(500, { error: message });
  }
}
