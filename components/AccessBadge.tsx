import { accessLabel } from "@/lib/access";
import type { ProtocolStatus } from "@/data/mock";

export function AccessBadge({ status }: { status: ProtocolStatus }) {
  return <span className={`access-badge ${status}`}>{accessLabel(status)}</span>;
}
