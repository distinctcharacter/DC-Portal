"use client";

import type { Role } from "@/data/mock";
import { usePortalAccess } from "@/lib/auth/portal-access";

function formatRole(role: Role) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PortalSessionCard({ fallbackRole = "client" as Role }) {
  const { loading, role } = usePortalAccess(fallbackRole);

  return (
    <div className="role-card">
      <span className="eyebrow">Portal Session</span>
      <strong>Distinct Character Access</strong>
      <span>{loading ? "Confirming access" : `Current access: ${formatRole(role)}`}</span>
    </div>
  );
}
