"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { claimPendingPurchases } from "@/lib/auth/purchase-claim";

export default function AuthCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState("Checking your portal session.");

  useEffect(() => {
    let cancelled = false;

    async function confirmSession() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        setStatus("No active session was found. Sign in with the same email used at checkout.");
        return;
      }

      const token = await getToken();
      const claimResult = await claimPendingPurchases(token);

      if (cancelled) return;

      if (claimResult.ok && claimResult.claimedCount > 0) {
        setStatus(`Authentication confirmed. Access claimed: ${claimResult.claimed.join(", ")}.`);
        return;
      }

      if (claimResult.ok) {
        setStatus("Authentication confirmed. You can return to the dashboard.");
        return;
      }

      setStatus("Authentication confirmed. Purchase access could not be refreshed. Please contact support.");
    }

    confirmSession();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

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
        <h1>Portal Access Confirmation</h1>
        <p>{status}</p>
        <Link className="button" href="/">
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
