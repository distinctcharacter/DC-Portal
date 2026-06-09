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

function mergeProtocolRow(row: ProtocolRow, existing?: Protocol): Protocol {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    phase: row.phase_label,
    type: existing?.type ?? (row.parent_protocol_id ? "child" : row.status === "future" ? "future" : "core"),
    status:
      existing?.status ??
      (row.status === "future" ? "future" : row.status === "active" ? "locked" : "future"),
    completion: existing?.completion ?? 0,
    nextAction: existing?.nextAction ?? "Access rules will resolve through DEV entitlements in the next phase.",
    description: row.description ?? existing?.description ?? "Protocol catalog record synced from Supabase DEV.",
    requirements: existing?.requirements,
    children: existing?.children
  };
}

export function SupabaseProtocolGrid() {
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [status, setStatus] = useState("Using mock protocol access state.");

  useEffect(() => {
    let mounted = true;

    async function loadProtocols() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) setStatus("Login required for DEV protocol catalog read. Showing mock catalog.");
        return;
      }

      const { data, error } = await supabase
        .from("protocols")
        .select("id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description")
        .order("sequence_order", { ascending: true });

      if (!mounted) return;

      if (error) {
        setStatus(`DEV catalog read needs review: ${error.message}. Showing mock catalog.`);
        return;
      }

      setRows(data ?? []);
      setStatus("Protocol catalog is reading from Supabase DEV. Access states remain mocked.");
    }

    loadProtocols();

    return () => {
      mounted = false;
    };
  }, []);

  const displayProtocols = useMemo(() => {
    if (!rows.length) return mockProtocols;

    return rows.map((row) => {
      const existing = mockProtocols.find((protocol) => protocol.id === row.id);
      return mergeProtocolRow(row, existing);
    });
  }, [rows]);

  return (
    <>
      <p className="dev-sync-note">{status}</p>
      <div className="protocol-grid">
        {displayProtocols.map((protocol) => (
          <ProtocolCard protocol={protocol} key={protocol.id} />
        ))}
      </div>
    </>
  );
}

