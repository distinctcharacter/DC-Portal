"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";

type PortalAccessState = {
  loading: boolean;
  role: Role;
  roles: Role[];
  protocolIds: string[];
  canAccessPractitionerLayer: boolean;
  canAccessLicenseLayer: boolean;
};

type PortalAccessPayload = {
  ok?: boolean;
  role?: Role;
  roles?: Role[];
  protocolIds?: string[];
  canAccessPractitionerLayer?: boolean;
  canAccessLicenseLayer?: boolean;
};

export function usePortalAccess(fallbackRole: Role = "client"): PortalAccessState {
  const [state, setState] = useState<PortalAccessState>({
    loading: true,
    role: fallbackRole,
    roles: [fallbackRole],
    protocolIds: [],
    canAccessPractitionerLayer: false,
    canAccessLicenseLayer: false
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (!cancelled) {
          setState({
            loading: false,
            role: fallbackRole,
            roles: [fallbackRole],
            protocolIds: [],
            canAccessPractitionerLayer: false,
            canAccessLicenseLayer: false
          });
        }
        return;
      }

      const response = await fetch("/.netlify/functions/portal-access", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (!cancelled) {
          setState({
            loading: false,
            role: fallbackRole,
            roles: [fallbackRole],
            protocolIds: [],
            canAccessPractitionerLayer: false,
            canAccessLicenseLayer: false
          });
        }
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
          canAccessLicenseLayer: Boolean(payload.canAccessLicenseLayer)
        });
      }
    }

    loadAccess();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadAccess();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [fallbackRole]);

  return state;
}
