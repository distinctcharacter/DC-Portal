"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtocolCard } from "@/components/ProtocolCard";
import { protocols as mockProtocols, type Protocol } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";

type ProtocolRow = {
  id: string;
  slug: string;
  title: string;
  phase_label: string;
  status: "active" | "draft" | "retired" | "future";
  sequence_order: number;
  parent_protocol_id: string | null;
  description: string | null;
};

type ProtocolProgressRow = {
  protocol_id: string;
  completion_percent: number;
  current_phase_key: string | null;
  last_activity_at: string | null;
};

type PortalCatalogPayload = {
  protocols?: ProtocolRow[];
  accessibleProtocolIds?: string[];
  progress?: ProtocolProgressRow[];
};

function mergeProtocolRow(
  row: ProtocolRow,
  accessibleProtocolIds: Set<string>,
  progressByProtocol: Map<string, ProtocolProgressRow>,
  existing?: Protocol
): Protocol {
  const hasAccess = accessibleProtocolIds.has(row.id);
  const progress = progressByProtocol.get(row.id);
  const completion = progress?.completion_percent ?? existing?.completion ?? 0;
  const defaultStatus = row.status === "future" ? "future" : hasAccess ? "available" : "locked";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    phase: row.phase_label,
    type: existing?.type ?? (row.parent_protocol_id ? "child" : row.status === "future" ? "future" : "core"),
    status:
      hasAccess && existing?.status === "in_progress"
        ? "in_progress"
        : hasAccess && existing?.status === "completed"
          ? "completed"
          : defaultStatus,
    completion,
    nextAction: hasAccess
      ? progress?.current_phase_key
        ? `Continue ${progress.current_phase_key.replaceAll("-", " ")}.`
        : existing?.nextAction ?? "Access active. Continue protocol work."
      : existing?.nextAction ?? "Purchase or prerequisite completion required.",
    description: row.description ?? existing?.description ?? "Protocol access is available through your account record.",
    requirements: existing?.requirements,
    children: existing?.children
  };
}

export function SupabaseProtocolGrid() {
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [accessibleProtocolIds, setAccessibleProtocolIds] = useState<Set<string>>(new Set());
  const [progressRows, setProgressRows] = useState<ProtocolProgressRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadProtocols() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch("/.netlify/functions/portal-catalog", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!mounted || !response.ok) {
        return;
      }

      const payload = (await response.json()) as PortalCatalogPayload;

      setAccessibleProtocolIds(new Set(payload.accessibleProtocolIds ?? []));
      setProgressRows(payload.progress ?? []);
      setRows(payload.protocols ?? []);
    }

    loadProtocols();

    return () => {
      mounted = false;
    };
  }, []);

  const displayProtocols = useMemo(() => {
    if (!rows.length) return mockProtocols;
    const progressByProtocol = new Map(progressRows.map((row) => [row.protocol_id, row]));

    return rows.map((row) => {
      const existing = mockProtocols.find((protocol) => protocol.id === row.id);
      return mergeProtocolRow(row, accessibleProtocolIds, progressByProtocol, existing);
    });
  }, [accessibleProtocolIds, progressRows, rows]);

  return (
    <>
      <div className="protocol-grid">
        {displayProtocols.map((protocol) => (
          <ProtocolCard protocol={protocol} key={protocol.id} />
        ))}
      </div>
    </>
  );
}
