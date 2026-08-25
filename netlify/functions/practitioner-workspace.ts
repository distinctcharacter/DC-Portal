import { requirePortalUser } from "./_shared/clerk-auth";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

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

  try {
    const user = await requirePortalUser(event.headers);
    const roles = await userRoles(user.id);
    const hasAccess = await userHasPractitionerLayerAccess(user.id, roles);

    if (!hasAccess) {
      return jsonResponse(403, { error: "Practitioner access is required." });
    }

    const sql = getSql();
    const relationships = await sql`
      select id, client_id, protocol_id, status, client_consented_at, practitioner_assigned_at
      from public.practitioner_client_relationships
      where practitioner_id = ${user.id}
        and status = 'active'
      order by practitioner_assigned_at desc
    `;

    const clientIds = Array.from(
      new Set((relationships as Array<{ client_id: string }>).map((row) => row.client_id))
    );
    const protocolIds = Array.from(
      new Set(
        (relationships as Array<{ protocol_id: string | null }>)
          .map((row) => row.protocol_id)
          .filter(Boolean)
      )
    ) as string[];

    const clients = clientIds.length
      ? await sql.query("select id, email, full_name from public.profiles where id = any($1::text[])", [
          clientIds
        ])
      : [];
    const protocols = protocolIds.length
      ? await sql.query("select id, title from public.protocols where id = any($1::text[])", [protocolIds])
      : [];
    const notes = await sql`
      select id, client_id, protocol_id, note_type, visibility, body, created_at
      from public.practitioner_notes
      where practitioner_id = ${user.id}
      order by created_at desc
      limit 12
    `;

    const clientMap = new Map((clients as Array<{ id: string }>).map((client) => [client.id, client]));
    const protocolMap = new Map((protocols as Array<{ id: string }>).map((protocol) => [protocol.id, protocol]));

    return jsonResponse(200, {
      ok: true,
      clients: (relationships as Array<{
        id: string;
        client_id: string;
        protocol_id: string | null;
        client_consented_at: string | null;
        practitioner_assigned_at: string;
      }>).map((relationship) => {
        const client = clientMap.get(relationship.client_id) as { email?: string; full_name?: string | null } | undefined;
        const protocol = relationship.protocol_id
          ? (protocolMap.get(relationship.protocol_id) as { title?: string } | undefined)
          : null;

        return {
          relationshipId: relationship.id,
          clientId: relationship.client_id,
          clientName: client?.full_name || client?.email || "Client",
          protocolId: relationship.protocol_id,
          protocolTitle: protocol?.title || "Cross-Protocol Review",
          consented: Boolean(relationship.client_consented_at),
          assignedAt: relationship.practitioner_assigned_at
        };
      }),
      notes: (notes as Array<{
        id: string;
        client_id: string;
        protocol_id: string | null;
        note_type: string;
        visibility: string;
        body: string;
        created_at: string;
      }>).map((note) => {
        const client = clientMap.get(note.client_id) as { email?: string; full_name?: string | null } | undefined;
        const protocol = note.protocol_id ? (protocolMap.get(note.protocol_id) as { title?: string } | undefined) : null;

        return {
          id: note.id,
          clientId: note.client_id,
          clientName: client?.full_name || client?.email || "Client",
          protocolId: note.protocol_id,
          protocolTitle: protocol?.title || "Cross-Protocol Review",
          noteType: note.note_type,
          visibility: note.visibility,
          body: note.body,
          createdAt: note.created_at
        };
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practitioner workspace could not be loaded.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
