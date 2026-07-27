"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortalAccess } from "@/lib/auth/portal-access";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Protocols" },
  { href: "/resources", label: "Resources" },
  { href: "/downloads", label: "Downloads" },
  { href: "/practitioner", label: "Practitioner" }
];

export function PortalNav() {
  const access = usePortalAccess();
  const [isFounderEmail, setIsFounderEmail] = useState(false);
  const showFounder = isFounderEmail || access.roles.includes("admin") || access.role === "admin";

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsFounderEmail(data.user?.email?.trim().toLowerCase() === "stephanie@granitefieldholdings.com");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsFounderEmail(session?.user?.email?.trim().toLowerCase() === "stephanie@granitefieldholdings.com");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
