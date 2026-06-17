import { AppShell } from "@/components/AppShell";
import { DownloadTable } from "@/components/DownloadTable";
import { ProgressTracker } from "@/components/ProgressTracker";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { SupabaseProtocolGrid } from "@/components/SupabaseProtocolGrid";
import { SupabaseResourceGrid } from "@/components/SupabaseResourceGrid";
import { downloads } from "@/data/mock";

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="hero-band">
        <div>
          <span className="eyebrow">Behavioral Governance Dashboard</span>
          <h1>Protocol operating system for regulated self-command.</h1>
          <p>
            Review your active protocol, current nervous system work, resource library, and next
            steps from one structured workspace.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/protocols/somatic-baseline">
              Continue Somatic Baseline
            </a>
            <a className="button secondary" href="/resources">
              Open Resource Library
            </a>
          </div>
        </div>
        <ProgressTracker />
      </section>

      <section className="stat-grid" aria-label="Portal summary">
        <StatCard label="Active Protocol" value="DC-P01-SBP" detail="Section II in progress" tone="gold" />
        <StatCard label="Progress" value="42%" detail="Exit assessment locked until all gates complete" tone="green" />
        <StatCard label="Current State" value="Zone Check Due" detail="Log one regulation practice today" tone="blue" />
        <StatCard label="Resources" value="9 Available" detail="Foundation and SBP resources unlocked" />
      </section>

      <section className="content-section" id="protocols">
        <SectionHeader
          eyebrow="Protocol Library"
          title="Sequential Access Model"
          copy="Your available protocols appear alongside the next work required for progression."
        />
        <SupabaseProtocolGrid />
      </section>

      <section className="content-section" id="resources">
        <SectionHeader
          eyebrow="Resource Library"
          title="Support Architecture"
          copy="Foundation resources and protocol companions remain organized, searchable, and easy to return to."
        />
        <SupabaseResourceGrid />
      </section>

      <section className="content-section" id="downloads">
        <SectionHeader
          eyebrow="Download Center"
          title="Printable Assets and Resource Files"
          copy="Printable companions, ledgers, assessments, and reference materials are organized by protocol."
        />
        <DownloadTable assets={downloads} />
      </section>

      <section className="two-column-section">
        <article className="placeholder-panel" id="practitioner">
          <span className="eyebrow">Practitioner Layer</span>
          <h2>Therapeutic Integration Workspace</h2>
          <p>
            Practitioner access remains separate from client access. Approved practitioner accounts
            receive dedicated review tools, therapeutic addenda, and professional resource
            materials.
          </p>
          <div className="hero-actions">
            <a className="button secondary" href="/practitioner">
              View Practitioner Layer
            </a>
          </div>
        </article>

        <article className="placeholder-panel" id="masterclass">
          <span className="eyebrow">Locked Access</span>
          <h2>Additional Training Access</h2>
          <p>
            This area is not currently available for this account.
          </p>
          <button className="button secondary" type="button" disabled>
            Access Locked
          </button>
        </article>
      </section>
    </AppShell>
  );
}
