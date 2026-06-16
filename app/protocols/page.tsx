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
          copy="Your available protocols appear alongside the next work required for progression."
        />
        <SupabaseProtocolGrid />
      </section>
    </AppShell>
  );
}
