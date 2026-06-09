import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SupabaseResourceGrid } from "@/components/SupabaseResourceGrid";

export default function ResourcesPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Resource Library"
          title="Support Architecture"
          copy="Foundation resources and protocol companions remain searchable, downloadable, and permission-aware. Practitioner-only resources stay gated under the mock access model."
        />
        <SupabaseResourceGrid />
      </section>
    </AppShell>
  );
}
