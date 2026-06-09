"use client";

import { useEffect, useMemo, useState } from "react";
import { ResourceCard } from "@/components/ResourceCard";
import { resources as mockResources, type Resource } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";

type ResourceAssetRow = {
  id: string;
  title: string;
  asset_type: string;
  protocol_id: string | null;
  public_path: string | null;
  audience: string;
  practitioner_only: boolean;
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapResourceRow(row: ResourceAssetRow, existing?: Resource): Resource {
  return {
    id: row.id,
    title: row.title,
    category: existing?.category ?? titleCase(row.asset_type),
    protocol: existing?.protocol ?? row.protocol_id ?? "Foundation",
    audience: row.practitioner_only ? "Practitioner" : existing?.audience ?? "Client + Practitioner",
    access: row.practitioner_only ? "Practitioner" : existing?.access ?? "Unlocked",
    description:
      existing?.description ??
      "Controlled resource metadata is reading from Supabase DEV. Signed URL delivery comes in the protected download phase.",
    href: row.public_path ?? existing?.href
  };
}

export function SupabaseResourceGrid() {
  const [rows, setRows] = useState<ResourceAssetRow[]>([]);
  const [status, setStatus] = useState("Using mock resource access state.");

  useEffect(() => {
    let mounted = true;

    async function loadResources() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) setStatus("Login required for DEV resource metadata read. Showing mock resources.");
        return;
      }

      const { data, error } = await supabase
        .from("resource_assets")
        .select("id, title, asset_type, protocol_id, public_path, audience, practitioner_only")
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (error) {
        setStatus(`DEV resource read needs review: ${error.message}. Showing mock resources.`);
        return;
      }

      if (!data?.length) {
        setStatus(
          "Protected resource metadata is entitlement-gated in DEV. Showing mock resources until entitlements are connected."
        );
        return;
      }

      setRows(data);
      setStatus("Resource metadata is reading from Supabase DEV. Download access remains mocked.");
    }

    loadResources();

    return () => {
      mounted = false;
    };
  }, []);

  const displayResources = useMemo(() => {
    if (!rows.length) return mockResources;

    return rows.map((row) => {
      const existing = mockResources.find((resource) => resource.id === row.id);
      return mapResourceRow(row, existing);
    });
  }, [rows]);

  return (
    <>
      <p className="dev-sync-note">{status}</p>
      <div className="resource-grid">
        {displayResources.map((resource) => (
          <ResourceCard resource={resource} key={resource.id} />
        ))}
      </div>
    </>
  );
}

