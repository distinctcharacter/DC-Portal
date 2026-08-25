import { AppShell } from "@/components/AppShell";
import { FounderSystemAuditDashboard } from "@/components/FounderSystemAuditDashboard";
import { SectionHeader } from "@/components/SectionHeader";

export default function FounderSystemAuditPage() {
  return (
    <AppShell sessionRole="admin">
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Founder Dashboard"
          title="System Audit"
          copy="A private view for checking purchase records, WooCommerce delivery, product mappings, and account access."
        />
        <FounderSystemAuditDashboard />
      </section>
    </AppShell>
  );
}
