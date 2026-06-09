import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { PurchaseClaimStatus } from "@/components/PurchaseClaimStatus";

export default function ClaimAccessPage() {
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
        <span className="eyebrow">Access Claim Preparation</span>
        <h1>Claim Portal Access</h1>
        <p>
          This page prepares the future post-purchase flow. Use the same email used at checkout.
          If your payment has been recorded, the portal will claim matching access after login.
        </p>
      </section>

      <PurchaseClaimStatus />
      <AuthPanel context="claim" />
    </main>
  );
}
