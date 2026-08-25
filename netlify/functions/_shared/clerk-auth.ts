import { verifyToken } from "@clerk/backend";
import { getSql, normalizeEmail } from "./neon";

type FunctionHeaders = Record<string, string | undefined>;

export type PortalUser = {
  id: string;
  clerkUserId: string;
  email: string;
  emailNormalized: string;
};

function getAuthorizationHeader(headers: FunctionHeaders) {
  return headers.Authorization ?? headers.authorization ?? "";
}

export function getBearerToken(headers: FunctionHeaders) {
  const authorization = getAuthorizationHeader(headers);
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
}

async function getClerkEmail(clerkUserId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY environment variable.");
  }

  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    throw new Error("Clerk user lookup failed.");
  }

  const payload = (await response.json()) as {
    primary_email_address_id?: string;
    email_addresses?: Array<{
      id: string;
      email_address: string;
      verification?: { status?: string } | null;
    }>;
    first_name?: string | null;
    last_name?: string | null;
  };

  const primaryEmail =
    payload.email_addresses?.find((email) => email.id === payload.primary_email_address_id) ??
    payload.email_addresses?.[0];

  if (!primaryEmail) {
    throw new Error("Clerk account is missing an email address.");
  }

  if (primaryEmail.verification?.status !== "verified") {
    throw new Error("A verified email address is required.");
  }

  return {
    email: primaryEmail.email_address,
    fullName: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || null
  };
}

export async function requirePortalUser(headers: FunctionHeaders): Promise<PortalUser> {
  const token = getBearerToken(headers);

  if (!token) {
    throw new Error("Login required.");
  }

  const verified = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: [
      process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.distinctcharacter.com"
    ]
  });

  const clerkUserId = String(verified.sub ?? "");

  if (!clerkUserId) {
    throw new Error("Login required.");
  }

  const { email, fullName } = await getClerkEmail(clerkUserId);
  const emailNormalized = normalizeEmail(email);
  const sql = getSql();
  const existingProfiles = await sql`
    select id, clerk_user_id
    from public.profiles
    where clerk_user_id = ${clerkUserId}
       or email_normalized = ${emailNormalized}
    order by case when clerk_user_id = ${clerkUserId} then 0 else 1 end
    limit 1
  `;
  const existingProfile = existingProfiles[0] as
    | { id: string; clerk_user_id: string | null }
    | undefined;
  const profileId = existingProfile?.id ?? clerkUserId;

  if (existingProfile) {
    await sql`
      update public.profiles
      set clerk_user_id = ${clerkUserId},
          email = ${email},
          full_name = coalesce(${fullName}, full_name),
          last_login_at = now(),
          updated_at = now()
      where id = ${profileId}
    `;
  } else {
    await sql`
      insert into public.profiles (
        id,
        clerk_user_id,
        email,
        full_name,
        last_login_at
      )
      values (
        ${profileId},
        ${clerkUserId},
        ${email},
        ${fullName},
        now()
      )
    `;
  }

  return {
    id: profileId,
    clerkUserId,
    email,
    emailNormalized
  };
}

