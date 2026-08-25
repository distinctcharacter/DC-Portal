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
    const accessIds = await getAccessibleProtocolIds(user.id, user.emailNormalized);
    const roleRows = (await sql`
      select role
      from public.user_role_assignments
      where user_id = ${user.id}
    `) as Array<{ role: string }>;
    const roles = roleRows.map((row) => row.role);
    const isAdmin = roles.includes("admin");
    const practitionerRows =
      isAdmin || !roles.includes("practitioner")
        ? []
        : await sql`
            select pe.id
            from public.protocol_entitlements pe
            join public.practitioner_profiles pp on pp.user_id = pe.user_id
            where pe.user_id = ${user.id}
              and pe.entitlement_type = 'practitioner_layer'
              and pe.status = 'active'
              and (pe.expires_at is null or pe.expires_at > now())
              and pp.access_status = 'active'
            limit 1
          `;
    const hasPractitionerAccess = isAdmin || practitionerRows.length > 0;

    const [protocols, resources, progress, practiceLogs] = await Promise.all([
      sql`
        select id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description
        from public.protocols
        order by sequence_order asc
      `,
      sql.query(
        `select id, title, asset_type, protocol_id, public_path, audience, practitioner_only
         from public.resource_assets
         where active = true
           and (protocol_id is null or protocol_id = any($1::text[]))
           and (practitioner_only = false or $2::boolean)
         order by created_at asc`,
        [accessIds, hasPractitionerAccess]
      ),
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
      `
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

