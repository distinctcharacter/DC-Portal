import Link from "next/link";
import { mockUser, type Role } from "@/data/mock";
import { AuthStatus } from "@/components/AuthStatus";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Protocols" },
  { href: "/resources", label: "Resources" },
  { href: "/downloads", label: "Downloads" },
  { href: "/practitioner", label: "Practitioner" },
  { href: "/masterclass", label: "Masterclass" }
];

type AppShellProps = {
  children: React.ReactNode;
  sessionRole?: Role;
};

export function AppShell({ children, sessionRole = mockUser.role }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <img src="/assets/dc-logo.png" alt="" />
          </span>
          <span>
            <strong>Distinct Character</strong>
            <small>Protocol Portal</small>
          </span>
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="role-card">
          <span className="eyebrow">Mock Session</span>
          <strong>{mockUser.name}</strong>
          <span>Role: {sessionRole}</span>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div>
            <span className="eyebrow">Protected Portal Shell</span>
            <p>DEV Supabase Auth is available. Protocol access and payments remain mocked.</p>
          </div>
          <AuthStatus />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
