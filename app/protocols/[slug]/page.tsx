import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProgressTracker } from "@/components/ProgressTracker";
import { ProtocolAccessBoundary } from "@/components/ProtocolAccessBoundary";
import { ProtocolCompletionPanel } from "@/components/ProtocolCompletionPanel";
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
import { canonicalProtocolSlug } from "@/lib/protocol-slugs";

type GenericProtocolPage = {
  id: string;
  accessProtocolIds?: string[];
  title: string;
  eyebrow: string;
  lead: string;
  calloutTitle: string;
  calloutCopy: string;
  sections: Array<{ title: string; body: string }>;
  assets: Array<{ label: string; href?: string }>;
  requirements: string[];
};

const genericProtocolPages: Record<string, GenericProtocolPage> = {
  "cognitive-architecture": {
    id: "DC-P02-COG",
    accessProtocolIds: ["DC-P02-COG", "DC-P02-IOS", "DC-P02-MES", "DC-P02-NCS"],
    title: "Cognitive Architecture",
    eyebrow: "DC-P02-COG",
    lead:
      "A three-part architecture for identity, masking economics, and narrative governance. This bundle stabilizes the interpretive systems that shape self-concept, emotional labor, visibility, and decision authority.",
    calloutTitle: "Bundle Completion Standard",
    calloutCopy:
      "Complete IOS-1, MES-1, and NCS-1 before marking the Cognitive Architecture Bundle complete.",
    sections: [
      {
        title: "Identity Operating System",
        body:
          "IOS-1 uses slower handwritten reflection to examine identity formation, inherited self-definitions, standards, and internal alignment without turning identity work into performance."
      },
      {
        title: "Masking Economy System",
        body:
          "MES-1 audits the cost, return, protection logic, and resource drain of adaptive presentation systems so masking can be governed rather than automatically maintained."
      },
      {
        title: "Narrative Control System",
        body:
          "NCS-1 separates event, interpretation, distortion, inherited meaning, and identity-level truth so clients can build cleaner narrative authority."
      }
    ],
    assets: [
      { label: "IOS-1 Printable Protocol", href: "/resources/ios1-protocol.pdf" },
      { label: "MES-1 Printable Protocol", href: "/resources/mes1-protocol.pdf" },
      { label: "NCS-1 Printable Protocol", href: "/resources/ncs1-protocol.pdf" }
    ],
    requirements: [
      "Complete IOS-1",
      "Complete MES-1",
      "Complete NCS-1",
      "Review cognitive architecture integration notes"
    ]
  },
  "identity-operating-system": {
    id: "DC-P02-IOS",
    accessProtocolIds: ["DC-P02-IOS", "DC-P02-COG"],
    title: "Identity Operating System",
    eyebrow: "DC-P02-IOS",
    lead:
      "A handwritten identity protocol for examining internal standards, self-definition, inherited roles, and the architecture of becoming.",
    calloutTitle: "Writing Requirement",
    calloutCopy:
      "IOS-1 remains primarily printable because handwriting is part of the psychological pacing and identity-contact design.",
    sections: [
      {
        title: "Identity Contact",
        body:
          "This protocol slows identity work enough to observe contradiction, grief, outdated roles, internal authority, and the difference between preferred self-image and operating identity."
      },
      {
        title: "Stabilization Before Redesign",
        body:
          "The objective is not forced reinvention. The objective is accurate identification of what is governing perception, behavior, and self-trust."
      }
    ],
    assets: [
      { label: "IOS-1 Printable Protocol", href: "/resources/ios1-protocol.pdf" },
      { label: "IOS-1 Companion", href: "/resources/ios1-companion.pdf" }
    ],
    requirements: ["Complete handwritten identity audit", "Review identity standards", "Record integration observations"]
  },
  "masking-economy-system": {
    id: "DC-P02-MES",
    accessProtocolIds: ["DC-P02-MES", "DC-P02-COG"],
    title: "Masking Economy System",
    eyebrow: "DC-P02-MES",
    lead:
      "A structural audit of masking as cost, protection, access strategy, and resource allocation.",
    calloutTitle: "Governance Objective",
    calloutCopy:
      "The goal is not indiscriminate unmasking. The goal is to classify which adaptations remain useful, which are costly, and which require new governance.",
    sections: [
      {
        title: "Cost Structure",
        body:
          "MES-1 identifies what is spent to maintain presentation, acceptability, relational stability, professional readability, and emotional editing."
      },
      {
        title: "Return and Dependency",
        body:
          "The protocol separates useful adaptation from inherited expenditure so the client can stop financing systems that no longer return stability or access."
      }
    ],
    assets: [
      { label: "MES-1 Printable Protocol", href: "/resources/mes1-protocol.pdf" },
      { label: "MES-1 Companion", href: "/resources/mes1-companion.pdf" }
    ],
    requirements: ["Complete masking cost audit", "Identify protection logic", "Define retained and retired adaptations"]
  },
  "narrative-control-system": {
    id: "DC-P02-NCS",
    accessProtocolIds: ["DC-P02-NCS", "DC-P02-COG"],
    title: "Narrative Control System",
    eyebrow: "DC-P02-NCS",
    lead:
      "A protocol for governing interpretation, inherited meaning, identity assignment, and narrative accuracy.",
    calloutTitle: "Interpretation Standard",
    calloutCopy:
      "The work is not positive thinking. The work is classification, calibration, and accurate interpretation before meaning becomes identity-level truth.",
    sections: [
      {
        title: "Narrative Source Audit",
        body:
          "NCS-1 examines where interpretations were installed and whether those meanings still produce accurate, sovereign decision-making."
      },
      {
        title: "Meaning Calibration",
        body:
          "The protocol separates event, conclusion, inherited standard, distortion, and chosen interpretation."
      }
    ],
    assets: [
      { label: "NCS-1 Printable Protocol", href: "/resources/ncs1-protocol.pdf" },
      { label: "NCS-1 Companion", href: "/resources/ncs1-companion.pdf" }
    ],
    requirements: ["Complete narrative source audit", "Classify inherited interpretations", "Document calibrated meanings"]
  },
  "execution-architecture": {
    id: "DC-P03-EXE",
    title: "Execution Architecture Protocol",
    eyebrow: "DC-P03-EXE",
    lead:
      "A governed execution system for capacity-aware action, decision closure, friction reduction, and sustainable follow-through.",
    calloutTitle: "Execution Standard",
    calloutCopy:
      "Execution is treated as infrastructure, not morality. Complete the protocol when the client has tested the execution engine under real capacity conditions.",
    sections: [
      {
        title: "Execution Engine",
        body:
          "The protocol identifies open loops, capacity leaks, friction points, hesitation costs, and the conditions under which action becomes structurally reliable."
      },
      {
        title: "Biological Realism",
        body:
          "Execution adjusts to capacity. The system protects action from urgency, perfectionism, depletion, and inherited performance pressure."
      }
    ],
    assets: [
      { label: "Execution Architecture Protocol", href: "/resources/execution-architecture-protocol.pdf" },
      { label: "Execution Architecture Companion", href: "/resources/execution-architecture-companion.pdf" }
    ],
    requirements: ["Complete execution audit", "Test friction-reduction system", "Document scaled execution model"]
  },
  "relational-command": {
    id: "DC-P04-REL",
    accessProtocolIds: ["DC-P04-REL", "DC-P04-AUT", "DC-P04-ISC"],
    title: "Relational Command",
    eyebrow: "DC-P04-REL",
    lead:
      "A two-part relational authority bundle for internal signal calibration, boundaries, command presence, pacing, and consequence enforcement.",
    calloutTitle: "Bundle Completion Standard",
    calloutCopy:
      "Complete Authority Framework and Internal Signal Calibration before marking Relational Command complete.",
    sections: [
      {
        title: "Authority Framework",
        body:
          "This protocol strengthens soft power, boundary clarity, relational governance, command posture, and non-performative authority."
      },
      {
        title: "Internal Signal Calibration",
        body:
          "This protocol trains signal fidelity so relational decisions are not governed by fear, appeasement, urgency, or over-functioning."
      }
    ],
    assets: [
      { label: "Authority Framework Protocol", href: "/resources/authority-framework-protocol.pdf" },
      { label: "Internal Signal Calibration Protocol", href: "/resources/internal-signal-calibration-protocol.pdf" }
    ],
    requirements: ["Complete Authority Framework", "Complete Internal Signal Calibration", "Review relational command integration"]
  },
  "authority-framework": {
    id: "DC-P04-AUT",
    accessProtocolIds: ["DC-P04-AUT", "DC-P04-REL"],
    title: "Authority Framework",
    eyebrow: "DC-P04-AUT",
    lead:
      "A protocol for relational authority, soft power, boundary governance, command posture, and consequence clarity.",
    calloutTitle: "Authority Standard",
    calloutCopy:
      "Complete the protocol when authority is no longer dependent on over-explaining, emotional pressure, or relational appeasement.",
    sections: [
      {
        title: "Command Presence",
        body:
          "The work clarifies how authority is held, communicated, protected, and enforced without collapsing into aggression or permission-seeking."
      },
      {
        title: "Boundary Governance",
        body:
          "Clients define boundary architecture, enforcement conditions, relational standards, and consequence pathways."
      }
    ],
    assets: [{ label: "Authority Framework Protocol", href: "/resources/authority-framework-protocol.pdf" }],
    requirements: ["Complete authority audit", "Define boundary standards", "Document enforcement logic"]
  },
  "internal-signal-calibration": {
    id: "DC-P04-ISC",
    accessProtocolIds: ["DC-P04-ISC", "DC-P04-REL"],
    title: "Internal Signal Calibration",
    eyebrow: "DC-P04-ISC",
    lead:
      "A protocol for distinguishing clean internal signal from fear, conditioning, relational pressure, nervous system activation, and avoidance.",
    calloutTitle: "Signal Fidelity Standard",
    calloutCopy:
      "Complete the protocol when the client can classify signal sources and make decisions without collapsing into automatic relational management.",
    sections: [
      {
        title: "Signal Classification",
        body:
          "The protocol separates intuition, pattern recognition, threat response, impulse, projection, and inherited compliance."
      },
      {
        title: "Decision Calibration",
        body:
          "Clients practice making decisions with enough nervous system literacy to protect clarity from urgency, fear, and performance."
      }
    ],
    assets: [{ label: "Internal Signal Calibration Protocol", href: "/resources/internal-signal-calibration-protocol.pdf" }],
    requirements: ["Complete signal source audit", "Document decision calibration", "Review relational application"]
  },
  "sovereignty-reset": {
    id: "DC-P05-SOV",
    title: "30-Day Sovereignty Reset",
    eyebrow: "DC-P05-SOV",
    lead:
      "A timed enforcement container for rebuilding behavioral sovereignty through daily governance, relational restraint, and structured self-command.",
    calloutTitle: "Completion Rule",
    calloutCopy:
      "Complete one uninterrupted 30-day Sovereignty cycle within the 60-day access window.",
    sections: [
      {
        title: "Daily Governance Container",
        body:
          "The reset turns comprehension into practice by requiring daily behavioral alignment, decision ownership, and visibility into breach patterns."
      },
      {
        title: "Restart Logic",
        body:
          "The 60-day window gives enough space to prepare and permits one full restart if protocol conditions are breached."
      }
    ],
    assets: [{ label: "30-Day Sovereignty Reset Protocol", href: "/resources/30-day-sovereignty-reset-protocol.pdf" }],
    requirements: ["Complete one uninterrupted 30-day cycle", "Review breach conditions", "Submit final reset audit"]
  },
  "self-mastery-blueprint": {
    id: "DC-P06-SMB",
    title: "Self-Mastery Blueprint",
    eyebrow: "DC-P06-SMB",
    lead:
      "The flagship capstone protocol for integrating biological stability, identity, execution, relational authority, and long-range life architecture.",
    calloutTitle: "Capstone Completion Standard",
    calloutCopy:
      "Complete the blueprint when the operating system has been integrated into a functional command center with clear standards, practices, and review logic.",
    sections: [
      {
        title: "Integrated Self-Mastery Architecture",
        body:
          "The blueprint consolidates prior protocol work into a whole-system operating model for personal authority, capacity, direction, and sustainable growth."
      },
      {
        title: "Command Center",
        body:
          "Clients define the structures, review cycles, decision rules, and standards that keep self-mastery operational beyond the portal container."
      }
    ],
    assets: [
      { label: "Self-Mastery Blueprint Protocol", href: "/resources/self-mastery-blueprint-protocol.pdf" },
      { label: "Relapse & Re-Entry Ledger", href: "/resources/self-mastery-blueprint-relapse-reentry-ledger.pdf" }
    ],
    requirements: ["Complete capstone architecture", "Document operating standards", "Review final self-mastery command center"]
  }
};

export default function ProtocolPage({
  params
}: {
  params: { slug: string };
}) {
  const slug = canonicalProtocolSlug(params.slug);
  const isSomatic = slug === "somatic-baseline";
  const isEnterpriseIp = slug === "enterprise-ip-mastermind";
  const genericPage = genericProtocolPages[slug];
  const role: Role = "client";
  const canComposeEnterpriseNotes = false;
  const canViewAddendum = canViewTherapeuticAddenda(role);
  const sbpAddendum = therapeuticAddenda.find((addendum) => addendum.id === "DC-P01-SBP-TA01");

  if (!isSomatic && !isEnterpriseIp && !genericPage) {
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

  if (genericPage) {
    return (
      <AppShell sessionRole={role}>
        <ProtocolAccessBoundary
          protocolId={genericPage.id}
          accessProtocolIds={genericPage.accessProtocolIds}
        >
          <section className="protocol-layout">
            <article className="protocol-reader">
              <Link className="back-link" href="/protocols">
                Back to protocols
              </Link>
              <span className="eyebrow">{genericPage.eyebrow}</span>
              <h1>{genericPage.title}</h1>
              <p className="lead">{genericPage.lead}</p>

              <div className="protocol-callout">
                <strong>{genericPage.calloutTitle}</strong>
                <p>{genericPage.calloutCopy}</p>
              </div>

              {genericPage.sections.map((section) => (
                <section className="reader-section" key={section.title}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </section>
              ))}

              <section className="reader-section">
                <h2>Downloadable Assets</h2>
                <div className="asset-strip">
                  {genericPage.assets.map((asset) =>
                    asset.href ? (
                      <ProtectedResourceButton href={asset.href} label={asset.label} key={asset.label} />
                    ) : (
                      <span key={asset.label}>{asset.label}</span>
                    )
                  )}
                </div>
              </section>

              <ProtocolCompletionPanel
                protocolId={genericPage.id}
                protocolTitle={genericPage.title}
              />
            </article>

            <div className="protocol-side">
              <ProgressTracker />
              <article className="side-card">
                <span className="eyebrow">Completion Requirements</span>
                <ul>
                  {genericPage.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </article>
              <article className="side-card">
                <span className="eyebrow">Access Window</span>
                <p>
                  Mark complete only after the product process is finished. Completion starts the
                  seven-day closeout period and does not extend access beyond the product deadline.
                </p>
              </article>
            </div>
          </section>
        </ProtocolAccessBoundary>
      </AppShell>
    );
  }

  if (isEnterpriseIp) {
    return (
      <AppShell sessionRole={role}>
        <ProtocolAccessBoundary protocolId="DC-P07-EIP">
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

            <ProtocolCompletionPanel
              protocolId="DC-P07-EIP"
              protocolTitle="Enterprise IP Mastermind"
            />
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
        </ProtocolAccessBoundary>
      </AppShell>
    );
  }

  return (
    <AppShell sessionRole={role}>
      <ProtocolAccessBoundary protocolId="DC-P01-SBP">
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

          <ProtocolCompletionPanel
            protocolId="DC-P01-SBP"
            protocolTitle="Somatic Baseline Protocol"
          />
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
      </ProtocolAccessBoundary>
    </AppShell>
  );
}
