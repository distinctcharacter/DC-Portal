import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SupabaseProtocolGrid } from "@/components/SupabaseProtocolGrid";

export default function ProtocolsPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Protocol Library"
          title="Sequential Access Model"
          copy="Each protocol has its own access record, progress gates, and resource set. Locked states clarify what becomes available next."
        />
        <SupabaseProtocolGrid />
      </section>
    </AppShell>
  );
}
