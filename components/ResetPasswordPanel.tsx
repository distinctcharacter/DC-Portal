"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

export function ResetPasswordPanel() {
  return (
    <section className="auth-panel" aria-label="Reset portal password">
      <div className="auth-note">
        <span className="eyebrow">Portal Recovery</span>
        <p>
          Password recovery is handled through the secure Clerk login flow. Open the login window,
          enter your email, and use the password reset option there.
        </p>
      </div>

      <SignInButton mode="modal" fallbackRedirectUrl="/auth/callback">
        <button className="button" type="button">
          Open Login Recovery
        </button>
      </SignInButton>

      <p>
        <Link className="table-link" href="/login">
          Return to login
        </Link>
      </p>
    </section>
  );
}
