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
          copy="Each protocol has its own entitlement, progress gates, and resource set. Locked states show why access is unavailable without pressure-based sales language."
        />
        <SupabaseProtocolGrid />
      </section>
    </AppShell>
  );
}
