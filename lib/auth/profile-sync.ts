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

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName
    },
    {
      onConflict: "email_normalized"
    }
  );

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  return {
    ok: true,
    message: "Portal profile synced."
  };
}
