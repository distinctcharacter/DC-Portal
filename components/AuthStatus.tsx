"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

export function AuthStatus() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <button className="button secondary" type="button" disabled>
        Checking access
      </button>
    );
  }

  if (!user) {
    return (
      <Link className="button secondary" href="/login">
        Login
      </Link>
    );
  }

  return (
    <div className="auth-status" aria-label="Authenticated account">
      <span>{user.primaryEmailAddress?.emailAddress ?? "Signed in"}</span>
      <UserButton />
    </div>
  );
}
