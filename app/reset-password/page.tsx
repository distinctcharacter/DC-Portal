import Link from "next/link";
import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";

export default function ResetPasswordPage() {
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
        <span className="eyebrow">Portal Recovery</span>
        <h1>Reset Password</h1>
        <p>
          Set a new password for the verified email connected to your portal account. After the
          password is updated, the portal will sync profile and purchase access.
        </p>
      </section>

      <ResetPasswordPanel />
    </main>
  );
}
