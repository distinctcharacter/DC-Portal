import type { DownloadAsset } from "@/data/mock";

export function DownloadTable({ assets }: { assets: DownloadAsset[] }) {
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
        <div className="download-row" role="row" key={asset.id}>
          <span>
            <strong>{asset.title}</strong>
            <small>{asset.id}</small>
          </span>
          <span>{asset.protocol}</span>
          <span>{asset.type}</span>
          <span className={`download-status ${asset.status.toLowerCase()}`}>{asset.status}</span>
          <span>
            {asset.href && asset.status !== "Locked" ? (
              <a className="table-link" href={asset.href} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : (
              <span className="table-muted">Locked</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
