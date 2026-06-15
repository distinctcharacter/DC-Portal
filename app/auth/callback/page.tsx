"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { claimPendingPurchases } from "@/lib/auth/purchase-claim";
import { syncProfile } from "@/lib/auth/profile-sync";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Checking your portal session.");

  useEffect(() => {
    let cancelled = false;

    async function confirmSession() {
      const timeout = window.setTimeout(() => {
        if (!cancelled) {
          setStatus("Session check is taking longer than expected. Refresh this page or request a new magic link.");
        }
      }, 8000);

      try {
        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setStatus(error.message);
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus(error.message);
          return;
        }

        if (data.session?.user) {
          const profileResult = await syncProfile(data.session.user);

          if (!profileResult.ok) {
            setStatus(`Authentication confirmed, but profile sync needs review: ${profileResult.message}`);
            return;
          }

          const claimResult = await claimPendingPurchases();

          if (claimResult.ok && claimResult.claimedCount > 0) {
            setStatus(`Authentication confirmed. Access claimed: ${claimResult.claimed.join(", ")}.`);
            return;
          }

          if (claimResult.ok) {
            setStatus("Authentication confirmed and portal profile synced. You can return to the dashboard.");
            return;
          }

          setStatus(
            `Authentication confirmed and portal profile synced. Purchase claim needs review: ${claimResult.error}`
          );
          return;
        }

        setStatus("No active session was found. Try opening the newest magic link from your email.");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    confirmSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">
            <img src="/assets/dc-logo.png" alt="" />
          </span>
          <span>
            <strong>Distinct Character</strong>
            <small>Protocol Portal</small>
          </span>
        </Link>
        <span className="eyebrow">Portal Authentication</span>
        <h1>Authentication Check</h1>
        <p>{status}</p>
        <Link className="button" href="/">
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
