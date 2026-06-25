 "use client";

import type { DownloadAsset } from "@/data/mock";
import { ProtectedResourceButton } from "@/components/ProtectedResourceButton";
import { usePortalAccess } from "@/lib/auth/portal-access";
import { canOpenResourceFromAccess } from "@/lib/resource-access-rules";

export function DownloadTable({ assets }: { assets: DownloadAsset[] }) {
  const access = usePortalAccess();

  return (
    <div className="download-table" role="table" aria-label="Download center assets">
      <div className="download-row header" role="row">
        <span>Asset</span>
        <span>Protocol</span>
        <span>Type</span>
        <span>Status</span>
        <span>File</span>
      </div>
      {assets.map((asset) => (
        <DownloadRow asset={asset} access={access} key={asset.id} />
      ))}
    </div>
  );
}

function DownloadRow({
  asset,
  access
}: {
  asset: DownloadAsset;
  access: ReturnType<typeof usePortalAccess>;
}) {
  const canOpen = canOpenResourceFromAccess({
    href: asset.href,
    status: asset.status,
    protocolIds: access.protocolIds,
    canAccessPractitionerLayer: access.canAccessPractitionerLayer,
    isAuthenticated: !access.loading
  });
  const displayStatus = canOpen && asset.status === "Locked" ? "Available" : asset.status;

  return (
    <div className="download-row" role="row">
      <span>
        <strong>{asset.title}</strong>
        <small>{asset.id}</small>
      </span>
      <span>{asset.protocol}</span>
      <span>{asset.type}</span>
      <span className={`download-status ${displayStatus.toLowerCase()}`}>{displayStatus}</span>
      <span>
        {canOpen ? (
          <ProtectedResourceButton className="table-link button-link" href={asset.href} label="Open" />
        ) : (
          <span className="table-muted">Locked</span>
        )}
      </span>
    </div>
  );
}
