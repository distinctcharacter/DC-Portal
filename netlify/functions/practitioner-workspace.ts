import {
  userHasPractitionerLayerAccess,
  userRoles
} from "./_shared/practitioner-access";
import { getSupabaseAdmin } from "./_shared/supabase-admin";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
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

    const roles = await userRoles(admin, data.user.id);
    const hasAccess = await userHasPractitionerLayerAccess(admin, data.user.id, roles);

    if (!hasAccess) {
      return jsonResponse(403, { error: "Practitioner access is required." });
    }

    const { data: relationships, error: relationshipError } = await admin
      .from("practitioner_client_relationships")
      .select("id, client_id, protocol_id, status, client_consented_at, practitioner_assigned_at")
      .eq("practitioner_id", data.user.id)
      .eq("status", "active")
      .order("practitioner_assigned_at", { ascending: false });

    if (relationshipError) throw relationshipError;

    const clientIds = Array.from(new Set((relationships ?? []).map((row) => row.client_id as string)));
    const protocolIds = Array.from(
      new Set((relationships ?? []).map((row) => row.protocol_id as string | null).filter(Boolean))
    ) as string[];

    const { data: clients, error: clientError } = clientIds.length
      ? await admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", clientIds)
      : { data: [], error: null };

    if (clientError) throw clientError;

    const { data: protocols, error: protocolError } = protocolIds.length
      ? await admin
          .from("protocols")
          .select("id, title")
          .in("id", protocolIds)
      : { data: [], error: null };

    if (protocolError) throw protocolError;

    const { data: notes, error: notesError } = await admin
      .from("practitioner_notes")
      .select("id, client_id, protocol_id, note_type, visibility, body, created_at")
      .eq("practitioner_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (notesError) throw notesError;

    const clientMap = new Map((clients ?? []).map((client) => [client.id as string, client]));
    const protocolMap = new Map((protocols ?? []).map((protocol) => [protocol.id as string, protocol]));

    return jsonResponse(200, {
      ok: true,
      clients: (relationships ?? []).map((relationship) => {
        const client = clientMap.get(relationship.client_id as string);
        const protocol = relationship.protocol_id
          ? protocolMap.get(relationship.protocol_id as string)
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
      notes: (notes ?? []).map((note) => {
        const client = clientMap.get(note.client_id as string);
        const protocol = note.protocol_id ? protocolMap.get(note.protocol_id as string) : null;

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
    return jsonResponse(500, { error: message });
  }
}
