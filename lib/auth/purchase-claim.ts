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

export async function claimPendingPurchases(token: string | null): Promise<PurchaseClaimResult> {
  if (!token) {
    return {
      ok: false,
      error: "Login required before purchase access can be claimed."
    };
  }

  const response = await fetch("/.netlify/functions/claim-purchases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
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
