import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
};

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
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
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
    const user = await requirePortalUser(event.headers);
    const roles = await userRoles(user.id);
    const hasAccess = await userHasPractitionerLayerAccess(user.id, roles);

    if (!hasAccess) {
      return jsonResponse(403, { error: "Practitioner access is required." });
    }

    const sql = getSql();
    const relationshipRows = await sql`
      select client_id, protocol_id
      from public.practitioner_client_relationships
      where id = ${relationshipId}
        and practitioner_id = ${user.id}
        and status = 'active'
      limit 1
    `;

    const relationship = relationshipRows[0] as { client_id: string; protocol_id: string | null } | undefined;

    if (!relationship) {
      return jsonResponse(403, { error: "This client is not assigned to this practitioner account." });
    }

    await sql`
      insert into public.practitioner_notes (
        practitioner_id,
        client_id,
        protocol_id,
        note_type,
        visibility,
        body
      )
      values (
        ${user.id},
        ${relationship.client_id},
        ${relationship.protocol_id},
        ${noteType},
        ${visibility},
        ${body}
      )
    `;

    return jsonResponse(200, {
      ok: true,
      message: "Practitioner note saved."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practitioner note could not be saved.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
