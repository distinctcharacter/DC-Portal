import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { SubstackSubscribeCard } from "@/components/SubstackSubscribeCard";

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
        <span className="eyebrow">Portal Authentication</span>
        <h1>Portal Access</h1>
        <p>
          Sign in with a magic link or password. Use the same email address used at checkout so
          the portal can match recorded purchases to protocol access.
        </p>
      </section>

      <div className="auth-stack">
        <AuthPanel />
        <SubstackSubscribeCard />
      </div>
    </main>
  );
}
