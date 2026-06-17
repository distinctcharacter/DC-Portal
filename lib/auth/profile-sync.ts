import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type ProfileSyncResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function syncProfile(user: User): Promise<ProfileSyncResult> {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return {
      ok: false,
      message: "Supabase returned a session without an email address."
    };
  }

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      ok: false,
      message: sessionError?.message ?? "Authenticated session could not be confirmed."
    };
  }

  const response = await fetch("/.netlify/functions/claim-purchases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    return {
      ok: false,
      message: "Portal access could not be refreshed."
    };
  }

  return {
    ok: true,
    message: "Portal access active."
  };
}
