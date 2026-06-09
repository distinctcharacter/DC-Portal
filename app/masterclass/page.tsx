import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";

export default function MasterclassPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Expansion Layer"
          title="Masterclass Series"
          copy="Future purchasable education lives outside the core protocol ladder. This preserves the seriousness of the sequential system while leaving room for advanced trainings and educational expansion."
        />
        <article className="placeholder-panel masterclass-panel">
          <span className="eyebrow">Future Offering Layer</span>
          <h2>Advanced Application Series</h2>
          <p>
            This area is reserved for future masterclasses, expansion trainings, and purchasable
            educational offerings. It is intentionally separated from the core protocol progression
            so the operating system remains structured, gated, and clinically adjacent.
          </p>
          <div className="lock-grid">
            <div>
              <strong>Core Boundary</strong>
              <span>Not required for protocol completion.</span>
            </div>
            <div>
              <strong>Purchase Model</strong>
              <span>Future standalone access or bundle entitlement.</span>
            </div>
            <div>
              <strong>Licensing Space</strong>
              <span>Can later support organization-specific training tracks.</span>
            </div>
          </div>
          <button className="button secondary" type="button" disabled>
            Future Access
          </button>
        </article>
      </section>
    </AppShell>
  );
}
