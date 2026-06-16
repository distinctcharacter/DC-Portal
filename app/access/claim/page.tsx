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
        <span className="eyebrow">Purchase Access</span>
        <h1>Claim Portal Access</h1>
        <p>
          Use the same email address used at checkout. The portal will review completed purchases
          connected to this account and unlock the matching protocol access.
        </p>
      </section>

      <PurchaseClaimStatus />
      <AuthPanel context="claim" />
    </main>
  );
}
