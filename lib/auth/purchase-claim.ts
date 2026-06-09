import { supabase } from "@/lib/supabase/client";

export type PurchaseClaimResult =
  | {
      ok: true;
      claimedCount: number;
      claimed: string[];
      skipped: string[];
    }
  | {
      ok: false;
      error: string;
    };

export async function claimPendingPurchases(): Promise<PurchaseClaimResult> {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      ok: false,
      error: sessionError.message
    };
  }

  if (!session?.access_token) {
    return {
      ok: false,
      error: "Login required before purchase access can be claimed."
    };
  }

  const response = await fetch("/.netlify/functions/claim-purchases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  const payload = (await response.json()) as PurchaseClaimResult;

  if (!response.ok) {
    return {
      ok: false,
      error: "error" in payload ? payload.error : "Purchase claim failed."
    };
  }

  return payload;
}

