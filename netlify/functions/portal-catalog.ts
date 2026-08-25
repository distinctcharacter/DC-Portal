import { requirePortalUser } from "./_shared/clerk-auth";
import { getAccessibleProtocolIds } from "./_shared/access-resolver";
import { getSql, jsonResponse } from "./_shared/neon";

type FunctionEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
};

export async function handler(event: FunctionEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const user = await requirePortalUser(event.headers);
    const sql = getSql();

    const [protocols, resources, progress, practiceLogs, accessIds] = await Promise.all([
      sql`
        select id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description
        from public.protocols
        order by sequence_order asc
      `,
      sql`
        select id, title, asset_type, protocol_id, public_path, audience, practitioner_only
        from public.resource_assets
        where active = true
        order by created_at asc
      `,
      sql`
        select protocol_id, completion_percent, current_phase_key, last_activity_at, completed_at
        from public.protocol_progress
        where user_id = ${user.id}
      `,
      sql`
        select id, protocol_id, practice_key, state_before, state_after, context_note, created_at
        from public.practice_logs
        where user_id = ${user.id}
        order by created_at desc
        limit 5
      `,
      getAccessibleProtocolIds(user.id, user.emailNormalized)
    ]);

    return jsonResponse(200, {
      ok: true,
      protocols,
      resources,
      progress,
      practiceLogs,
      accessibleProtocolIds: accessIds
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal catalog could not be loaded.";
    return jsonResponse(message === "Login required." ? 401 : 500, { error: message });
  }
}
