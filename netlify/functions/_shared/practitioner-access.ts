import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseClient = SupabaseClient<any, "public", any>;

export async function userHasPractitionerLayerAccess(
  admin: DatabaseClient,
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

export async function userRoles(admin: DatabaseClient, userId: string) {
  const { data, error } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.role as string);
}
