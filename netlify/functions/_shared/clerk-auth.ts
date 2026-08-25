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
    email_addresses?: Array<{ id: string; email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
  };

  const primaryEmail =
    payload.email_addresses?.find((email) => email.id === payload.primary_email_address_id)?.email_address ??
    payload.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    throw new Error("Clerk account is missing an email address.");
  }

  return {
    email: primaryEmail,
    fullName: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || null
  };
}

export async function requirePortalUser(headers: FunctionHeaders): Promise<PortalUser> {
  const token = getBearerToken(headers);

  if (!token) {
    throw new Error("Login required.");
  }

  const verified = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY
  });

  const clerkUserId = String(verified.sub ?? "");

  if (!clerkUserId) {
    throw new Error("Login required.");
  }

  const { email, fullName } = await getClerkEmail(clerkUserId);
  const emailNormalized = normalizeEmail(email);
  const sql = getSql();
  const profileId = clerkUserId;

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
    on conflict (clerk_user_id)
    do update set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      last_login_at = now(),
      updated_at = now()
  `;

  return {
    id: profileId,
    clerkUserId,
    email,
    emailNormalized
  };
}
