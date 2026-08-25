"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { usePortalAccess } from "@/lib/auth/portal-access";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Protocols" },
  { href: "/resources", label: "Resources" },
  { href: "/downloads", label: "Downloads" },
  { href: "/practitioner", label: "Practitioner" }
];

export function PortalNav() {
  const access = usePortalAccess();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  const showFounder =
    email === "stephanie@granitefieldholdings.com" || access.roles.includes("admin") || access.role === "admin";

  return (
    <nav className="nav-list">
      {navItems.map((item) => (
        <Link href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
      {showFounder ? <Link href="/founder/orders">Orders</Link> : null}
    </nav>
  );
}
