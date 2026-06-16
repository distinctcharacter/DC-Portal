import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProgressTracker } from "@/components/ProgressTracker";
import { SectionHeader } from "@/components/SectionHeader";
import { sbpSections, therapeuticAddenda, type Role } from "@/data/mock";
import { canViewTherapeuticAddenda } from "@/lib/access";

export default function ProtocolPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { access?: string };
}) {
  const isSomatic = params.slug === "somatic-baseline";
  const role: Role = "client";
  const canViewAddendum = canViewTherapeuticAddenda(role);
  const sbpAddendum = therapeuticAddenda.find((addendum) => addendum.id === "DC-P01-SBP-TA01");

  if (!isSomatic) {
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
            <div className="mock-form">
              <label>
                Trigger or context
                <input value="High-stakes message received before regulation" readOnly />
              </label>
              <label>
                Protocol selected
                <select defaultValue="physiological-sigh">
                  <option value="physiological-sigh">Physiological Sigh</option>
                  <option value="humming">Humming / Vagal Vibration</option>
                  <option value="sensory">Sensory Anchoring</option>
                </select>
              </label>
              <label>
                Resulting shift
                <textarea
                  value="Activation reduced from urgent reaction to workable response. Next step: wait ten minutes before replying."
                  readOnly
                />
              </label>
              <button className="button primary" type="button">
                Save Log
              </button>
            </div>
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
                <a className="button secondary" href="/practitioner?access=practitioner#therapeutic-addenda">
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
