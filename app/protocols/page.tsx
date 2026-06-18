import { AppShell } from "@/components/AppShell";
import { PortalProtocolGrid } from "@/components/PortalProtocolGrid";
import { SectionHeader } from "@/components/SectionHeader";

export default function ProtocolsPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Protocol Library"
          title="Sequential Access Model"
          copy="Your available protocols appear alongside the next work required for progression."
        />
        <PortalProtocolGrid />
      </section>
    </AppShell>
  );
}
