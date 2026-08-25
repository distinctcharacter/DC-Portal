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

      const response = await fetch("/.netlify/functions/portal-access", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (!cancelled) setState(emptyAccess(fallbackRole));
        return;
      }

      const payload = (await response.json()) as PortalAccessPayload;

      if (!cancelled) {
        setState({
          loading: false,
          role: payload.role ?? fallbackRole,
          roles: payload.roles?.length ? payload.roles : [payload.role ?? fallbackRole],
          protocolIds: payload.protocolIds ?? [],
          canAccessPractitionerLayer: Boolean(payload.canAccessPractitionerLayer),
          canAccessLicenseLayer: Boolean(payload.canAccessLicenseLayer),
          hasActivePortalAccess: Boolean(payload.hasActivePortalAccess),
          activeAccessUntil: payload.activeAccessUntil ?? null,
          activeEntitlementCount: payload.activeEntitlementCount ?? 0
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
