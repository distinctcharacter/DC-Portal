import Link from "next/link";
import { Protocol } from "@/data/mock";
import { canOpenProtocol } from "@/lib/access";
import { AccessBadge } from "./AccessBadge";

export function ProtocolCard({ protocol }: { protocol: Protocol }) {
  const open = canOpenProtocol(protocol.status);

  return (
    <article className={`protocol-card ${open ? "" : "is-locked"}`}>
      <div className="card-topline">
        <span className="protocol-id">{protocol.id}</span>
        <AccessBadge status={protocol.status} />
      </div>
      <h3>{protocol.title}</h3>
      <p>{protocol.description}</p>
      {protocol.children ? (
        <div className="child-list" aria-label={`${protocol.title} child protocols`}>
          {protocol.children.map((child) => (
            <span key={child}>{child}</span>
          ))}
        </div>
      ) : null}
      <div className="progress-shell" aria-label={`${protocol.completion}% complete`}>
        <span style={{ width: `${protocol.completion}%` }} />
      </div>
      <p className="next-action">{protocol.nextAction}</p>
      {open ? (
        <Link className="button primary" href={`/protocols/${protocol.slug}`}>
          Continue Protocol
        </Link>
      ) : (
        <button className="button secondary" type="button" disabled>
          Access Locked
        </button>
      )}
    </article>
  );
}
