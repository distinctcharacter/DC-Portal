"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { Role } from "@/data/mock";

type PortalAccessState = {
  loading: boolean;
  role: Role;
  roles: Role[];
  protocolIds: string[];
  canAccessPractitionerLayer: boolean;
  canAccessLicenseLayer: boolean;
  hasActivePortalAccess: boolean;
  activeAccessUntil: string | null;
  activeEntitlementCount: number;
};

type PortalAccessPayload = {
  ok?: boolean;
  role?: Role;
  roles?: Role[];
  protocolIds?: string[];
  canAccessPractitionerLayer?: boolean;
  canAccessLicenseLayer?: boolean;
  hasActivePortalAccess?: boolean;
  activeAccessUntil?: string | null;
  activeEntitlementCount?: number;
};

type PortalCatalogPayload = {
  ok?: boolean;
  accessibleProtocolIds?: string[];
};

function emptyAccess(fallbackRole: Role): PortalAccessState {
  return {
    loading: false,
    role: fallbackRole,
    roles: [fallbackRole],
    protocolIds: [],
    canAccessPractitionerLayer: false,
    canAccessLicenseLayer: false,
    hasActivePortalAccess: false,
    activeAccessUntil: null,
    activeEntitlementCount: 0
  };
}

export function usePortalAccess(fallbackRole: Role = "client"): PortalAccessState {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<PortalAccessState>({
    ...emptyAccess(fallbackRole),
    loading: true
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        if (!cancelled) setState(emptyAccess(fallbackRole));
        return;
      }

      const token = await getToken();

      if (!token) {
        if (!cancelled) setState(emptyAccess(fallbackRole));
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`
      };

      await fetch("/.netlify/functions/claim-purchases", {
        method: "POST",
        headers: authHeaders
      }).catch(() => null);

      const [accessResponse, catalogResponse] = await Promise.all([
        fetch("/.netlify/functions/portal-access", {
          headers: authHeaders
        }),
        fetch("/.netlify/functions/portal-catalog", {
          headers: authHeaders
        }).catch(() => null)
      ]);

      if (!accessResponse.ok && !catalogResponse?.ok) {
        if (!cancelled) setState(emptyAccess(fallbackRole));
        return;
      }

      const accessPayload = accessResponse.ok
        ? ((await accessResponse.json()) as PortalAccessPayload)
        : {};
      const catalogPayload = catalogResponse?.ok
        ? ((await catalogResponse.json()) as PortalCatalogPayload)
        : {};
      const protocolIds = Array.from(
        new Set([
          ...(accessPayload.protocolIds ?? []),
          ...(catalogPayload.accessibleProtocolIds ?? [])
        ])
      );

      if (!cancelled) {
        setState({
          loading: false,
          role: accessPayload.role ?? fallbackRole,
          roles: accessPayload.roles?.length ? accessPayload.roles : [accessPayload.role ?? fallbackRole],
          protocolIds,
          canAccessPractitionerLayer: Boolean(accessPayload.canAccessPractitionerLayer),
          canAccessLicenseLayer: Boolean(accessPayload.canAccessLicenseLayer),
          hasActivePortalAccess: Boolean(accessPayload.hasActivePortalAccess || protocolIds.length > 0),
          activeAccessUntil: accessPayload.activeAccessUntil ?? null,
          activeEntitlementCount: accessPayload.activeEntitlementCount ?? protocolIds.length
        });
      }
    }

    loadAccess();

    return () => {
      cancelled = true;
    };
  }, [fallbackRole, getToken, isLoaded, isSignedIn]);

  return state;
}
