"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

type AuthPanelProps = {
  context?: "login" | "claim";
};

export function AuthPanel({ context = "login" }: AuthPanelProps) {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <section className="auth-panel" aria-label="Portal access">
        <button className="button" type="button" disabled>
          Checking access
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Portal access">
      {!isSignedIn ? (
        <>
        <div className="auth-tabs" role="group" aria-label="Authentication actions">
          <SignInButton mode="modal" fallbackRedirectUrl="/auth/callback">
            <button className="active" type="button">
              Login
            </button>
          </SignInButton>
          <SignUpButton mode="modal" fallbackRedirectUrl="/auth/callback">
            <button type="button">Create account</button>
          </SignUpButton>
        </div>

        <div className="auth-note">
          <span className="eyebrow">Portal Access</span>
          <p>
            Use the same email address used at checkout. Clerk manages account access; the portal
            then matches completed purchases to the correct protocol entitlement.
          </p>
        </div>
        </>
      ) : (
        <>
        <div className="auth-status expanded">
          <UserButton />
          <span>{user?.primaryEmailAddress?.emailAddress ?? "Signed in"}</span>
        </div>
        <Link className="button" href={context === "claim" ? "/auth/callback" : "/"}>
          {context === "claim" ? "Check Purchased Access" : "Enter Portal"}
        </Link>
        </>
      )}
    </section>
  );
}
