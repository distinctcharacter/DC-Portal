import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";

export default function MasterclassPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Locked Access"
          title="Additional Training Access"
          copy="This area is not currently available for this account."
        />
        <article className="placeholder-panel masterclass-panel">
          <span className="eyebrow">Access Required</span>
          <h2>Training Area Locked</h2>
          <p>
            Access to this area requires an active purchase or account permission.
          </p>
          <div className="lock-grid">
            <div>
              <strong>Status</strong>
              <span>Locked</span>
            </div>
            <div>
              <strong>Access</strong>
              <span>Requires permission</span>
            </div>
            <div>
              <strong>Next Step</strong>
              <span>Return to your active protocol workspace.</span>
            </div>
          </div>
          <button className="button secondary" type="button" disabled>
            Access Locked
          </button>
        </article>
      </section>
    </AppShell>
  );
}
