"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function ResetPasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Checking recovery session.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError) {
        setMessage("");
        setError(sessionError.message);
        return;
      }

      if (data.session?.user) {
        setReady(true);
        setMessage("Recovery session confirmed. Enter a new password for portal access.");
        return;
      }

      setMessage("");
      setError("No active recovery session was found. Open the newest password reset email from the same browser.");
    }

    checkSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setError("");
        setMessage("Recovery session confirmed. Enter a new password for portal access.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The two password fields do not match.");
      return;
    }

    setPending(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setMessage("Password updated. Syncing portal access now.");
      window.location.assign("/auth/callback");
    } catch (updateError) {
      const description = updateError instanceof Error ? updateError.message : "Password update failed.";
      setError(description);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel" aria-label="Reset portal password">
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          New password
          <input
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="Enter new password"
            disabled={!ready || pending}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            placeholder="Confirm new password"
            disabled={!ready || pending}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        <button className="button" type="submit" disabled={!ready || pending}>
          {pending ? "Updating" : "Set new password"}
        </button>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <div className="auth-note">
        <span className="eyebrow">Portal Recovery</span>
        <p>
          Recovery links expire. If this page cannot confirm the session, return to login and send
          one new reset email.
        </p>
        <p>
          <Link className="table-link" href="/login">
            Return to login
          </Link>
        </p>
      </div>
    </section>
  );
}
