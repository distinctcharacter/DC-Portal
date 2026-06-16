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

type EntitlementRow = {
  entitlement_type: "protocol" | "bundle" | string;
  protocol_id: string | null;
  status: string;
};

type BundleProtocolRow = {
  bundle_protocol_id: string;
  child_protocol_id: string;
};

function mergeProtocolRow(row: ProtocolRow, accessibleProtocolIds: Set<string>, existing?: Protocol): Protocol {
  const hasAccess = accessibleProtocolIds.has(row.id);
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
    completion: existing?.completion ?? 0,
    nextAction: hasAccess
      ? existing?.nextAction ?? "Access active. Continue protocol work."
      : existing?.nextAction ?? "Purchase or prerequisite completion required.",
    description: row.description ?? existing?.description ?? "Protocol catalog record synced from Supabase DEV.",
    requirements: existing?.requirements,
    children: existing?.children
  };
}

export function SupabaseProtocolGrid() {
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [accessibleProtocolIds, setAccessibleProtocolIds] = useState<Set<string>>(new Set());
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

      const { data: entitlements, error: entitlementError } = await supabase
        .from("protocol_entitlements")
        .select("entitlement_type, protocol_id, status")
        .eq("status", "active");

      if (entitlementError) {
        setStatus(`Catalog loaded. Entitlement read needs review: ${entitlementError.message}.`);
        setRows(data ?? []);
        return;
      }

      const bundleIds = ((entitlements ?? []) as EntitlementRow[])
        .filter((entitlement) => entitlement.entitlement_type === "bundle" && entitlement.protocol_id)
        .map((entitlement) => entitlement.protocol_id as string);

      let bundleChildren: BundleProtocolRow[] = [];

      if (bundleIds.length) {
        const { data: childRows, error: childError } = await supabase
          .from("bundle_protocols")
          .select("bundle_protocol_id, child_protocol_id")
          .in("bundle_protocol_id", bundleIds);

        if (childError) {
          setStatus(`Catalog loaded. Bundle access needs review: ${childError.message}.`);
          setRows(data ?? []);
          return;
        }

        bundleChildren = (childRows ?? []) as BundleProtocolRow[];
      }

      const nextAccessibleIds = new Set<string>();

      for (const entitlement of (entitlements ?? []) as EntitlementRow[]) {
        if (entitlement.protocol_id) nextAccessibleIds.add(entitlement.protocol_id);
      }

      for (const child of bundleChildren) {
        nextAccessibleIds.add(child.child_protocol_id);
      }

      setAccessibleProtocolIds(nextAccessibleIds);
      setRows(data ?? []);
      setStatus("Protocol catalog and access state are reading from Supabase.");
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
      return mergeProtocolRow(row, accessibleProtocolIds, existing);
    });
  }, [accessibleProtocolIds, rows]);

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
