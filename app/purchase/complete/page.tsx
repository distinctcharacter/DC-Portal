import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { PurchaseClaimStatus } from "@/components/PurchaseClaimStatus";

export default function PurchaseCompletePage() {
  return (
    <main className="auth-page purchase-complete-page">
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
        <span className="eyebrow">Purchase Complete</span>
        <h1>Prepare Your Portal Access</h1>
        <p>
          Sign in or create your portal account with the same email address used at checkout.
          Once the email is verified, the portal will match the purchase record and unlock the
          correct protocol access.
        </p>
        <div className="purchase-complete-steps">
          <div>
            <strong>1</strong>
            <span>Use checkout email</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Confirm portal login</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Enter assigned protocol</span>
          </div>
        </div>
      </section>

      <div className="purchase-complete-panel">
        <PurchaseClaimStatus />
        <AuthPanel context="claim" />
      </div>
    </main>
  );
}
