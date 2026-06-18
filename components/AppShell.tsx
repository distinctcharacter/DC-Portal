import Link from "next/link";
import { mockUser, type Role } from "@/data/mock";
import { AuthStatus } from "@/components/AuthStatus";
import { PortalSessionCard } from "@/components/PortalSessionCard";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Protocols" },
  { href: "/resources", label: "Resources" },
  { href: "/downloads", label: "Downloads" },
  { href: "/practitioner", label: "Practitioner" }
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
        <PortalSessionCard fallbackRole={sessionRole} />
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div>
            <span className="eyebrow">Distinct Character Portal</span>
            <p>Continue your protocol work, resources, and guided progression from one private workspace.</p>
          </div>
          <AuthStatus />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
