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

type PortalCatalogPayload = {
  resources?: ResourceAssetRow[];
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
      "This resource supports your active protocol work.",
    href: row.public_path ?? existing?.href
  };
}

export function PortalResourceGrid() {
  const [rows, setRows] = useState<ResourceAssetRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadResources() {
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

      if (!payload.resources?.length) {
        return;
      }

      setRows(payload.resources);
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
      <div className="resource-grid">
        {displayResources.map((resource) => (
          <ResourceCard resource={resource} key={resource.id} />
        ))}
      </div>
    </>
  );
}
