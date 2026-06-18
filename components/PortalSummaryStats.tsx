"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/lib/supabase/client";

type ProtocolRow = {
  id: string;
  title: string;
  sequence_order: number;
};

type ProgressRow = {
  protocol_id: string;
  completion_percent: number;
  current_phase_key: string | null;
  last_activity_at: string | null;
};

type PracticeLogRow = {
  state_after: string | null;
  created_at: string;
};

type PortalCatalogPayload = {
  protocols?: ProtocolRow[];
  progress?: ProgressRow[];
  practiceLogs?: PracticeLogRow[];
  accessibleProtocolIds?: string[];
  resources?: unknown[];
};

function formatPhase(value: string | null | undefined) {
  if (!value) return "Continue protocol work";

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PortalSummaryStats() {
  const [payload, setPayload] = useState<PortalCatalogPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (mounted) setLoaded(true);
        return;
      }

      const response = await fetch("/.netlify/functions/portal-catalog", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!mounted) return;

      if (response.ok) {
        setPayload((await response.json()) as PortalCatalogPayload);
      }

      setLoaded(true);
    }

    loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const protocols = payload?.protocols ?? [];
    const accessibleIds = payload?.accessibleProtocolIds ?? [];
    const activeProtocol =
      protocols.find((protocol) => accessibleIds.includes(protocol.id)) ?? protocols[0];
    const progress = payload?.progress?.find((row) => row.protocol_id === activeProtocol?.id);
    const latestLog = payload?.practiceLogs?.[0];
    const completion = progress?.completion_percent ?? 0;

    return {
      activeProtocolId: activeProtocol?.id ?? "Protocol Access",
      activeProtocolTitle: activeProtocol?.title ?? "Login to view available protocols",
      completion,
      phase: formatPhase(progress?.current_phase_key),
      currentState: latestLog?.state_after ?? "Practice log available",
      resourcesAvailable: payload?.resources?.length ?? 0
    };
  }, [payload]);

  if (!loaded) {
    return (
      <section className="stat-grid" aria-label="Portal summary">
        <StatCard label="Active Protocol" value="Loading" detail="Confirming portal access" tone="gold" />
        <StatCard label="Progress" value="-" detail="Loading current protocol state" tone="green" />
        <StatCard label="Current State" value="-" detail="Loading recent practice activity" tone="blue" />
        <StatCard label="Resources" value="-" detail="Loading available resource library" />
      </section>
    );
  }

  return (
    <section className="stat-grid" aria-label="Portal summary">
      <StatCard
        label="Active Protocol"
        value={summary.activeProtocolId}
        detail={summary.activeProtocolTitle}
        tone="gold"
      />
      <StatCard
        label="Progress"
        value={`${summary.completion}%`}
        detail={summary.completion ? `${summary.phase} in progress` : "Begin or continue protocol work"}
        tone="green"
      />
      <StatCard
        label="Current State"
        value={summary.currentState}
        detail="Latest saved regulation entry"
        tone="blue"
      />
      <StatCard
        label="Resources"
        value={`${summary.resourcesAvailable} Available`}
        detail="Resource library records loaded for this account"
      />
    </section>
  );
}
