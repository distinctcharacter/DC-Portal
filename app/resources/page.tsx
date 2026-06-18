import { AppShell } from "@/components/AppShell";
import { PortalResourceGrid } from "@/components/PortalResourceGrid";
import { SectionHeader } from "@/components/SectionHeader";

export default function ResourcesPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Resource Library"
          title="Support Architecture"
          copy="Foundation resources and protocol companions remain organized, searchable, and easy to return to."
        />
        <PortalResourceGrid />
      </section>
    </AppShell>
  );
}
