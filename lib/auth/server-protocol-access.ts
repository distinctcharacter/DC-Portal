import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { getAccessibleProtocolIds } from "@/netlify/functions/_shared/access-resolver";
import { getSql, normalizeEmail } from "@/netlify/functions/_shared/neon";

const FOUNDER_EMAIL = "stephanie@granitefieldholdings.com";
const TERMS_VERSION = "dc-portal-terms-v2-2025";

export type ServerProtocolAccess = "allowed" | "guest" | "terms_required" | "denied";

export async function getServerProtocolAccess(
  protocolIds: string[]
): Promise<ServerProtocolAccess> {
  const { userId } = await auth();

  if (!userId) return "guest";

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;

  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return "denied";
  }

  if (user.publicMetadata?.dc_terms_version !== TERMS_VERSION) {
    return "terms_required";
  }

  const emailNormalized = normalizeEmail(primaryEmail.emailAddress);

  if (emailNormalized === FOUNDER_EMAIL) return "allowed";

  const sql = getSql();
  const profiles = await sql`
    select id
    from public.profiles
    where clerk_user_id = ${userId}
       or email_normalized = ${emailNormalized}
    order by case when clerk_user_id = ${userId} then 0 else 1 end
    limit 1
  `;
  const profileId = (profiles[0] as { id?: string } | undefined)?.id ?? userId;
  const roles = await sql`
    select role
    from public.user_role_assignments
    where user_id = ${profileId}
      and role = 'admin'
    limit 1
  `;

  if (roles.length) return "allowed";

  const accessibleProtocolIds = await getAccessibleProtocolIds(profileId, emailNormalized);
  return protocolIds.some((protocolId) => accessibleProtocolIds.includes(protocolId))
    ? "allowed"
    : "denied";
}

