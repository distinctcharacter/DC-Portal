import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";

export default function LoginPage() {
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
        <span className="eyebrow">DEV Authentication</span>
        <h1>Portal Access</h1>
        <p>
          Sign in with a magic link or password. This connects only to the Supabase development
          project. Protocol access, payments, and downloads remain in mock mode.
        </p>
      </section>

      <AuthPanel />
    </main>
  );
}

