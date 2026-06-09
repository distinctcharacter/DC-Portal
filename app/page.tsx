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
            Review active protocol access, current nervous system work, resource architecture, and
            practitioner-gated layers from one protected shell.
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
          copy="Each protocol has its own entitlement, progress gates, and resource set. Locked states show why access is unavailable without marketing pressure."
        />
        <SupabaseProtocolGrid />
      </section>

      <section className="content-section" id="resources">
        <SectionHeader
          eyebrow="Resource Library"
          title="Support Architecture"
          copy="Foundation resources and protocol companions remain searchable, downloadable, and permission-aware."
        />
        <SupabaseResourceGrid />
      </section>

      <section className="content-section" id="downloads">
        <SectionHeader
          eyebrow="Download Center"
          title="Printable Assets and Controlled Resources"
          copy="Printable companions, ledgers, assessments, and practitioner materials are displayed according to the mock access model."
        />
        <DownloadTable assets={downloads} />
      </section>

      <section className="two-column-section">
        <article className="placeholder-panel" id="practitioner">
          <span className="eyebrow">Practitioner Layer</span>
          <h2>Therapeutic Integration Workspace</h2>
          <p>
            Practitioner access remains locked for client-only sessions. The workspace now includes
            client review, therapeutic addenda, notes workflow, and practitioner resource library
            states for review before backend authentication is connected.
          </p>
          <div className="hero-actions">
            <a className="button secondary" href="/practitioner">
              View Locked State
            </a>
            <a className="button primary" href="/practitioner?access=practitioner">
              Preview Practitioner
            </a>
          </div>
        </article>

        <article className="placeholder-panel" id="masterclass">
          <span className="eyebrow">Expansion Layer</span>
          <h2>Masterclass Series</h2>
          <p>
            Future purchasable education lives outside the core protocol ladder. This preserves the
            seriousness of the sequential system while leaving room for advanced trainings.
          </p>
          <a className="button secondary" href="/masterclass">
            Future Access
          </a>
        </article>
      </section>
    </AppShell>
  );
}
