"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { syncProfile } from "@/lib/auth/profile-sync";
import { supabase } from "@/lib/supabase/client";

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState("Profile not synced");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);

      if (data.user) {
        syncProfile(data.user).then((result) => {
          if (!mounted) return;
          setProfileStatus(result.ok ? "Profile synced" : "Profile sync needs review");
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        syncProfile(session.user).then((result) => {
          setProfileStatus(result.ok ? "Profile synced" : "Profile sync needs review");
        });
      } else {
        setProfileStatus("Profile not synced");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfileStatus("Profile not synced");
  }

  if (loading) {
    return (
      <button className="button secondary" type="button" disabled>
        Checking access
      </button>
    );
  }

  if (!user) {
    return (
      <Link className="button secondary" href="/login">
        Login
      </Link>
    );
  }

  return (
    <div className="auth-status" aria-label="Authenticated DEV account">
      <span title={profileStatus}>{user.email}</span>
      <button className="button secondary" type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
