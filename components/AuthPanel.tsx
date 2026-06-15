"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "magic" | "reset";

type AuthPanelProps = {
  context?: "login" | "claim";
};

export function AuthPanel({ context = "login" }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setPending(true);

    try {
      if (!normalizedEmail) {
        setError("Enter the email address used for your portal access.");
        return;
      }

      if (mode === "magic") {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (authError) throw authError;
        setMessage("Magic link sent. Check your email and open the link on this device.");
        return;
      }

      if (mode === "reset") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (authError) throw authError;
        setMessage("Password reset email sent. Open the newest email and set your password inside the portal.");
        return;
      }

      if (!password) {
        setError("Enter your password.");
        return;
      }

      if (mode === "signup") {
        const { error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (authError) throw authError;
        setMessage("Account created. Check your email if Supabase asks you to confirm it.");
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (authError) throw authError;
      setMessage("Login successful. Syncing portal access.");
      window.location.assign("/auth/callback");
    } catch (authError) {
      const description = authError instanceof Error ? authError.message : "Authentication failed.";
      setError(description);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel" aria-label="Portal access">
      <div className="auth-tabs" role="tablist" aria-label="Authentication method">
        <button
          className={mode === "magic" ? "active" : ""}
          type="button"
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
        <button
          className={mode === "login" ? "active" : ""}
          type="button"
          onClick={() => setMode("login")}
        >
          Password
        </button>
        <button
          className={mode === "signup" ? "active" : ""}
          type="button"
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="email"
            placeholder="name@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {mode !== "magic" && mode !== "reset" ? (
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Enter password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}

        <button className="button" type="submit" disabled={pending}>
          {pending
            ? "Processing"
            : mode === "magic"
              ? "Send magic link"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send password reset"
                  : "Login"}
        </button>
      </form>

      <div className="auth-secondary-actions">
        {mode === "login" ? (
          <button type="button" onClick={() => setMode("reset")}>
            Reset password
          </button>
        ) : mode === "reset" ? (
          <button type="button" onClick={() => setMode("login")}>
            Return to password login
          </button>
        ) : null}
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {context === "claim" ? (
        <div className="auth-note">
          <span className="eyebrow">Purchase Claim Safety</span>
          <p>
            Use the same verified email used at checkout. Protocol access will stay mocked until
            a matching Stripe purchase has been recorded and claimed by this portal account.
          </p>
        </div>
      ) : null}
    </section>
  );
}
