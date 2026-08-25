"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { usePortalAccess } from "@/lib/auth/portal-access";

type ProtocolAccessBoundaryProps = {
  protocolId: string;
  accessProtocolIds?: string[];
  children: ReactNode;
};

export function ProtocolAccessBoundary({
  protocolId,
  accessProtocolIds,
  children
}: ProtocolAccessBoundaryProps) {
  const access = usePortalAccess();
  const isAdmin = access.roles.includes("admin");
  const allowedProtocolIds = accessProtocolIds?.length ? accessProtocolIds : [protocolId];
  const hasProtocolAccess = allowedProtocolIds.some((allowedProtocolId) =>
    access.protocolIds.includes(allowedProtocolId)
  );

  if (access.loading) {
    return (
      <section className="content-section">
        <div className="placeholder-panel">
          <span className="eyebrow">Protocol Access</span>
          <h2>Preparing protocol workspace.</h2>
          <p>Your product access is being confirmed.</p>
        </div>
      </section>
    );
  }

  if (!isAdmin && !hasProtocolAccess) {
    return (
      <section className="content-section">
        <div className="placeholder-panel">
          <span className="eyebrow">Protocol Access</span>
          <h2>This protocol is not active for this account.</h2>
          <p>
            Use the same email address connected to your purchase to claim access, or return to
            the protocol library to continue with an active product.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/access/claim">
              Claim Product Access
            </Link>
            <Link className="button secondary" href="/protocols">
              Return to Protocols
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
