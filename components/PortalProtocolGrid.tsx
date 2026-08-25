"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ProtocolCard } from "@/components/ProtocolCard";
import { protocols as mockProtocols, type Protocol } from "@/data/mock";

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
  completed_at?: string | null;
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
  const completed = Boolean(progress?.completed_at) || completion >= 100;
  const defaultStatus = row.status === "future" ? "future" : hasAccess ? "available" : "locked";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    phase: row.phase_label,
    type: existing?.type ?? (row.parent_protocol_id ? "child" : row.status === "future" ? "future" : "core"),
    status:
      hasAccess && completed
          ? "completed"
          : hasAccess && existing?.status === "in_progress"
            ? "in_progress"
            : defaultStatus,
    completion,
    nextAction: hasAccess
      ? progress?.current_phase_key
        ? `Continue ${progress.current_phase_key.replaceAll("-", " ")}.`
        : existing?.nextAction ?? "Access active. Continue protocol work."
      : existing?.nextAction ?? "This protocol opens when it is available in your portal.",
    description: row.description ?? existing?.description ?? "This protocol belongs to your Distinct Character library.",
    requirements: existing?.requirements,
    children: existing?.children
  };
}

export function PortalProtocolGrid() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [accessibleProtocolIds, setAccessibleProtocolIds] = useState<Set<string>>(new Set());
  const [progressRows, setProgressRows] = useState<ProtocolProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProtocols() {
      if (!isLoaded || !isSignedIn) return;
      const token = await getToken();

      if (!token) {
        if (mounted) {
          setError("Sign in to view your protocol library.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/.netlify/functions/portal-catalog", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!mounted) return;

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error ?? "Protocol library could not be loaded.");
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as PortalCatalogPayload;

        setAccessibleProtocolIds(new Set(payload.accessibleProtocolIds ?? []));
        setProgressRows(payload.progress ?? []);
        setRows(payload.protocols ?? []);
        setError("");
        setLoading(false);
      } catch {
        if (!mounted) return;
        setError("Protocol library could not be loaded.");
        setLoading(false);
      }
    }

    if (isLoaded && !isSignedIn) {
      setError("Sign in to view your protocol library.");
      setLoading(false);
      return;
    }

    loadProtocols();

    return () => {
      mounted = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const displayProtocols = useMemo(() => {
    if (!rows.length) return [];
    const progressByProtocol = new Map(progressRows.map((row) => [row.protocol_id, row]));

    return rows.map((row) => {
      const existing = mockProtocols.find((protocol) => protocol.id === row.id);
      return mergeProtocolRow(row, accessibleProtocolIds, progressByProtocol, existing);
    });
  }, [accessibleProtocolIds, progressRows, rows]);

  return (
    <>
      {loading ? (
        <section className="placeholder-panel">
          <span className="eyebrow">Protocol Library</span>
          <h2>Loading your protocol library.</h2>
          <p>Your portal is checking active products and protocol availability.</p>
        </section>
      ) : error ? (
        <section className="placeholder-panel">
          <span className="eyebrow">Protocol Library</span>
          <h2>Protocol library is unavailable.</h2>
          <p>{error}</p>
        </section>
      ) : displayProtocols.length ? (
        <div className="protocol-grid">
          {displayProtocols.map((protocol) => (
            <ProtocolCard protocol={protocol} key={protocol.id} />
          ))}
        </div>
      ) : (
        <section className="placeholder-panel">
          <span className="eyebrow">Protocol Library</span>
          <h2>Protocol library is temporarily unavailable.</h2>
          <p>Please try again later or contact support if access was recently purchased.</p>
        </section>
      )}
    </>
  );
}
