import { AppShell } from "@/components/AppShell";
import { FounderOrdersDashboard } from "@/components/FounderOrdersDashboard";
import { SectionHeader } from "@/components/SectionHeader";

export default function FounderOrdersPage() {
  return (
    <AppShell sessionRole="admin">
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Founder Dashboard"
          title="Orders and Access Records"
          copy="A private administrative view for reviewing client purchases, account claim status, and payment automation health."
        />
        <FounderOrdersDashboard />
      </section>
    </AppShell>
  );
}
