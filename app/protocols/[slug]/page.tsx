import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProgressTracker } from "@/components/ProgressTracker";
import { ProtectedResourceButton } from "@/components/ProtectedResourceButton";
import { SectionHeader } from "@/components/SectionHeader";
import { SomaticResetLog } from "@/components/SomaticResetLog";
import {
  enterpriseIpClientNotes,
  enterpriseIpModules,
  sbpSections,
  therapeuticAddenda,
  type Role
} from "@/data/mock";
import { canViewTherapeuticAddenda } from "@/lib/access";

export default function ProtocolPage({
  params
}: {
  params: { slug: string };
}) {
  const isSomatic = params.slug === "somatic-baseline";
  const isEnterpriseIp = params.slug === "enterprise-ip-mastermind";
  const role: Role = "client";
  const canComposeEnterpriseNotes = false;
  const canViewAddendum = canViewTherapeuticAddenda(role);
  const sbpAddendum = therapeuticAddenda.find((addendum) => addendum.id === "DC-P01-SBP-TA01");

  if (!isSomatic && !isEnterpriseIp) {
    return (
      <AppShell sessionRole={role}>
        <section className="content-section">
          <SectionHeader
            eyebrow="Protocol Access"
            title="Protocol Currently Locked"
            copy="This protocol is not available for this account yet. Complete the required prior protocol or purchase the matching protocol access."
          />
          <Link className="button primary" href="/">
            Return to Dashboard
          </Link>
        </section>
      </AppShell>
    );
  }

  if (isEnterpriseIp) {
    return (
      <AppShell sessionRole={role}>
        <section className="protocol-layout enterprise-ip-layout">
          <article className="protocol-reader">
            <Link className="back-link" href="/protocols">
              Back to protocols
            </Link>
            <span className="eyebrow">DC-P07-EIP</span>
            <h1>Enterprise IP Mastermind</h1>
            <p className="lead">
              A commercial incubation system for women converting governed self-mastery, proprietary
              insight, and structured authority into intellectual property that can be sold, delivered,
              reviewed, and prepared for future licensing.
            </p>

            <div className="protocol-callout">
              <strong>Current Build Standard</strong>
              <p>
                Each module produces a commercial asset. Progress is based on completed decisions,
                submitted deliverables, review gates, and readiness for responsible market activation.
              </p>
            </div>

            <section className="reader-section">
              <span className="eyebrow">Commercial Incubation Path</span>
              <h2>Module Progression</h2>
              <p>
                The mastermind moves from identity stabilization into IP extraction, market category
                control, offer architecture, pricing, delivery governance, licensing preparation, risk
                review, and commercialization.
              </p>
              <div className="module-map">
                {enterpriseIpModules.map((module) => (
                  <article className="module-card" key={module.id} id={`module-${module.id.toLowerCase()}`}>
                    <div className="card-topline">
                      <span className="protocol-id">{module.id}</span>
                      <span className="resource-access unlocked">{module.phase}</span>
                    </div>
                    <h3>{module.title}</h3>
                    <p>{module.objective}</p>
                    <dl>
                      <div>
                        <dt>Deliverable</dt>
                        <dd>{module.deliverable}</dd>
                      </div>
                      <div>
                        <dt>Completion Gate</dt>
                        <dd>{module.gate}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className="reader-section client-notes-section">
              <span className="eyebrow">Client Notes</span>
              <h2>Module Review Notes</h2>
              <p>
                Module-specific guidance, refinement notes, and next-step direction appear here as
                the commercial incubation work progresses.
              </p>
              <div className="client-note-grid">
                {enterpriseIpClientNotes.map((note) => {
                  const module = enterpriseIpModules.find((item) => item.id === note.moduleId);
                  return (
                    <article className="client-note-card" key={note.id}>
                      <div className="card-topline">
                        <span className="protocol-id">
                          {note.moduleId}
                          {module ? ` - ${module.title}` : ""}
                        </span>
                        <span className={`note-status ${note.status.toLowerCase()}`}>{note.status}</span>
                      </div>
                      <h3>{note.title}</h3>
                      <p>{note.body}</p>
                      <small>Updated {note.updatedAt}</small>
                    </article>
                  );
                })}
              </div>
            </section>

            {canComposeEnterpriseNotes ? (
              <section className="tool-panel client-note-composer">
                <div>
                  <span className="eyebrow">Advisor Note Workspace</span>
                  <h2>Leave a Module Note</h2>
                  <p>
                    Write module-specific direction that the client can use to refine the next
                    deliverable without losing the structure of the commercial incubation path.
                  </p>
                </div>
                <div className="mock-form">
                  <label>
                    Module
                    <select defaultValue="M4">
                      {enterpriseIpModules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.id}: {module.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Note title
                    <input value="Framework encoding refinement" readOnly />
                  </label>
                  <label>
                    Client-facing note
                    <textarea
                      value="Clarify the difference between the principle, the step, and the decision rule. This will make the method easier to teach and safer to prepare for licensing."
                      readOnly
                    />
                  </label>
                  <button className="button primary" type="button">
                    Save Note
                  </button>
                </div>
              </section>
            ) : null}
          </article>

          <div className="protocol-side">
            <article className="side-card">
              <span className="eyebrow">Mastermind Outputs</span>
              <ul>
                <li>Commercial Authority Profile</li>
                <li>Classified IP Asset Register</li>
                <li>Framework Encoding Map</li>
                <li>Premium Offer Architecture Brief</li>
                <li>Pricing and Revenue Model Brief</li>
                <li>Licensing Readiness Brief</li>
                <li>Final IP Commercialization Brief</li>
              </ul>
            </article>
            <article className="side-card">
              <span className="eyebrow">Resource Suite</span>
              <p>
                The resource suite supports the course modules with assessments, matrices,
                calculators, roadmap planning, and commercialization briefs.
              </p>
              <ProtectedResourceButton
                href="/resources/enterprise-ip-mastermind-resource-suite.pdf"
                label="Open Resource Suite"
              />
            </article>
            <article className="side-card">
              <span className="eyebrow">Review Standard</span>
              <p>
                Module review focuses on structure, buyer fit, scope, claims hygiene, and readiness
                for the next completion gate.
              </p>
            </article>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell sessionRole={role}>
      <section className="protocol-layout">
        <article className="protocol-reader">
          <Link className="back-link" href="/">
            Back to dashboard
          </Link>
          <span className="eyebrow">DC-P01-SBP</span>
          <h1>Somatic Baseline Protocol</h1>
          <p className="lead">
            The biological foundation of the Distinct Character ecosystem. This protocol installs
            nervous system literacy, state recognition, tactical reset practice, and a measurable
            return-to-command loop.
          </p>

          <div className="protocol-callout">
            <strong>Current Gate</strong>
            <p>
              Complete the Biological Architecture section and log one tactical reset before the
              Environmental Audit unlocks.
            </p>
          </div>

          <section className="reader-section">
            <h2>Section II: Biological Architecture</h2>
            <p>
              Before behavior changes, the system must know what state it is operating from.
              Neuroception continuously scans for safety or threat, often before conscious thought
              can explain the reaction. In this portal, the client learns to label the state, select
              the appropriate protocol, and record the result without turning regulation into a
              performance.
            </p>
            <p>
              The working objective is not permanent calm. The objective is structural stability:
              enough ventral access to think, choose, communicate, and execute without chronic
              survival pressure leading the system.
            </p>
          </section>

          <section className="tool-panel">
            <div>
              <span className="eyebrow">Interactive Tool</span>
              <h2>Nervous System Zone Check</h2>
              <p>
                Select the current nervous system zone before choosing the next regulation or
                execution step.
              </p>
            </div>
            <div className="zone-grid" role="group" aria-label="Nervous system state selector">
              <button type="button">Zone 1: Ventral</button>
              <button type="button">Zone 2: Sympathetic</button>
              <button type="button">Zone 3: Dorsal</button>
            </div>
          </section>

          <section className="tool-panel">
            <div>
              <span className="eyebrow">Required Practice</span>
              <h2>Tactical Reset Log</h2>
              <p>
                Track the intervention, before-state, after-state, and whether the practice returned
                enough capacity for the next governed action.
              </p>
            </div>
            <SomaticResetLog />
          </section>

          <section className="reader-section">
            <h2>Downloadable Assets</h2>
            <div className="asset-strip">
              <span>Somatic Dysregulation Index</span>
              <span>Daily Governance Log</span>
              <span>Somatic Quick Reference</span>
            </div>
          </section>

          <section className={`reader-section practitioner-addendum ${canViewAddendum ? "is-open" : "is-locked"}`}>
            <span className="eyebrow">Practitioner-Only Layer</span>
            <h2>Somatic Baseline Therapeutic Addendum</h2>
            {canViewAddendum && sbpAddendum ? (
              <>
                <p>{sbpAddendum.scope}</p>
                <div className="protocol-callout">
                  <strong>Review Use</strong>
                  <p>{sbpAddendum.reviewUse}</p>
                </div>
                <a className="button secondary" href="/practitioner#therapeutic-addenda">
                  Open Practitioner Addenda Library
                </a>
              </>
            ) : (
              <>
                <p>
                  This addendum is reserved for approved practitioner access.
                </p>
                <button className="button secondary" type="button" disabled>
                  Practitioner Access Required
                </button>
              </>
            )}
          </section>
        </article>

        <div className="protocol-side">
          <ProgressTracker />
          <article className="side-card">
            <span className="eyebrow">Phase Requirements</span>
            <ul>
              <li>Complete SDI baseline</li>
              <li>Finish all section reflections</li>
              <li>Log tactical reset practice</li>
              <li>Submit exit assessment</li>
            </ul>
          </article>
          <article className="side-card">
            <span className="eyebrow">Section Map</span>
            {sbpSections.map((section) => (
              <p key={section.id}>
                <strong>{section.title}</strong>
                <br />
                {section.summary}
              </p>
            ))}
          </article>
        </div>
      </section>
    </AppShell>
  );
}
