"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { claimPendingPurchases, type PurchaseClaimResult } from "@/lib/auth/purchase-claim";

type ClaimState = "checking" | "login_required" | "claimed" | "none" | "error";

function statusCopy(state: ClaimState, result: PurchaseClaimResult | null) {
  if (state === "checking") return "Checking for purchased access tied to this email.";
  if (state === "login_required") return "Login with the same email used at checkout to claim access.";
  if (state === "claimed" && result?.ok) {
    return `Access claimed: ${result.claimed.join(", ")}.`;
  }
  if (state === "none") return "No new purchases were found for this verified email.";
  if (result && !result.ok) return result.error;
  return "Purchase access could not be confirmed. Please contact support.";
}

export function PurchaseClaimStatus() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<ClaimState>("checking");
  const [result, setResult] = useState<PurchaseClaimResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runClaimCheck() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        if (!cancelled) setState("login_required");
        return;
      }

      const claimResult = await claimPendingPurchases(await getToken());

      if (cancelled) return;

      setResult(claimResult);

      if (!claimResult.ok) {
        setState("error");
        return;
      }

      setState(claimResult.claimedCount > 0 ? "claimed" : "none");
    }

    runClaimCheck();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <section className={`claim-status claim-status-${state}`} aria-live="polite">
      <span className="eyebrow">Purchase Access</span>
      <p>{statusCopy(state, result)}</p>
      {result?.ok && result.skipped.length > 0 ? (
        <p className="auth-error">{result.skipped.join(" ")}</p>
      ) : null}
    </section>
  );
}
