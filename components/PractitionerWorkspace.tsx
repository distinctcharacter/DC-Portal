import Link from "next/link";
import {
  practitionerClients,
  practitionerNotes,
  resources,
  therapeuticAddenda,
  type Role
} from "@/data/mock";
import {
  canManagePractitionerNotes,
  canReviewClients,
  canViewPractitionerLayer,
  canViewTherapeuticAddenda,
  practitionerAccessReason
} from "@/lib/access";
import { ResourceCard } from "@/components/ResourceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";

export function PractitionerWorkspace({ role }: { role: Role }) {
  const hasPractitionerAccess = canViewPractitionerLayer(role);
  const practitionerResources = resources.filter((resource) => resource.access === "Practitioner");

  if (!hasPractitionerAccess) {
    return (
      <section className="content-section">
        <article className="locked-workspace">
          <span className="eyebrow">Practitioner Layer</span>
          <h1>Therapeutic integration workspace is locked.</h1>
          <p>
            This layer is reserved for practitioner, admin, and future licensed implementation
            access. Client users can continue protocols and download their permitted resources, but
            they cannot view therapeutic addenda, practitioner notes, client review tools, or
            implementation supervision materials.
          </p>
          <div className="lock-grid">
            <div>
              <strong>Locked Access Logic</strong>
              <span>{practitionerAccessReason(role)}</span>
            </div>
            <div>
              <strong>Hidden From Client View</strong>
              <span>Client review queue, practitioner resource library, therapeutic addenda.</span>
            </div>
            <div>
              <strong>Future Backend Rule</strong>
              <span>Supabase role claim plus product entitlement check before page render.</span>
            </div>
          </div>
          <div className="hero-actions">
            <Link className="button primary" href="/practitioner?access=practitioner">
              Preview Practitioner Access
            </Link>
            <Link className="button secondary" href="/">
              Return to Dashboard
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <>
      <section className="hero-band practitioner-hero">
        <div>
          <span className="eyebrow">Practitioner Layer</span>
          <h1>Client review and therapeutic integration console.</h1>
          <p>
            Review assigned client progress, monitor pacing signals, access practitioner-only
            addenda, and document implementation notes without exposing clinical-adjacent guidance
            to client-only accounts.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#client-review">
              Review Clients
            </a>
            <a className="button secondary" href="#therapeutic-addenda">
              Open Addenda
            </a>
          </div>
        </div>
        <div className="access-panel">
          <span className="eyebrow">Access Check</span>
          <strong>Practitioner entitlement active</strong>
          <p>{practitionerAccessReason(role)}</p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{role}</dd>
            </div>
            <div>
              <dt>Client Review</dt>
              <dd>{canReviewClients(role) ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Notes Workflow</dt>
              <dd>{canManagePractitionerNotes(role) ? "Enabled" : "Read Only"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="stat-grid" aria-label="Practitioner summary">
        <StatCard label="Assigned Clients" value="3" detail="Mock implementation cohort" tone="gold" />
        <StatCard label="Needs Review" value="1" detail="Capacity and pacing check recommended" tone="blue" />
        <StatCard label="Practitioner Notes" value="3" detail="Draft, shared, and practitioner-only states" />
        <StatCard label="Addenda" value="3" detail="Role-gated therapeutic implementation material" tone="green" />
      </section>

      <section className="content-section" id="client-review">
        <SectionHeader
          eyebrow="Client Review View"
          title="Assigned Client Progress"
          copy="This view gives practitioners a structured readout without exposing sensitive private notes to the client dashboard."
        />
        <div className="client-review-grid">
          {practitionerClients.map((client) => (
            <article className={`client-review-card ${client.riskFlag.toLowerCase().replace(" ", "-")}`} key={client.id}>
              <div className="card-topline">
                <span className="protocol-id">{client.id}</span>
                <span className="review-flag">{client.riskFlag}</span>
              </div>
              <h3>{client.name}</h3>
              <p>{client.protocol}</p>
              <dl>
                <div>
                  <dt>Current Phase</dt>
                  <dd>{client.phase}</dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>{client.completion}%</dd>
                </div>
              </dl>
              <div className="progress-shell" aria-label={`${client.completion}% complete`}>
                <span style={{ width: `${client.completion}%` }} />
              </div>
              <p>{client.lastSignal}</p>
              <strong className="next-review">Next review: {client.nextReview}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="therapeutic-addenda">
        <SectionHeader
          eyebrow="Practitioner-Only Therapeutic Addenda"
          title="Role-Gated Implementation Guidance"
          copy="Addenda are visible only when practitioner access is active. They support pacing, safety boundaries, observation, and referral awareness."
        />
        <div className="addenda-list">
          {canViewTherapeuticAddenda(role) &&
            therapeuticAddenda.map((addendum) => (
              <article className="addendum-card" key={addendum.id}>
                <span className="protocol-id">{addendum.id}</span>
                <h3>{addendum.title}</h3>
                <p>{addendum.scope}</p>
                <strong>Review use</strong>
                <p>{addendum.reviewUse}</p>
              </article>
            ))}
        </div>
      </section>

      <section className="content-section" id="notes">
        <SectionHeader
          eyebrow="Notes and Review Workflow"
          title="Practitioner Observation Ledger"
          copy="Mock note states demonstrate how production can separate private practitioner notes from client-visible feedback."
        />
        <div className="notes-layout">
          <div className="notes-list">
            {practitionerNotes.map((note) => (
              <article className="note-card" key={note.id}>
                <div className="card-topline">
                  <span className="protocol-id">{note.id}</span>
                  <span className="note-status">{note.status}</span>
                </div>
                <h3>{note.client}</h3>
                <p>{note.protocol}</p>
                <strong>{note.type}</strong>
                <p>{note.summary}</p>
              </article>
            ))}
          </div>
          <form className="mock-form note-composer">
            <span className="eyebrow">Mock Composer</span>
            <h3>New Practitioner Note</h3>
            <label>
              Client
              <select defaultValue="CL-1042">
                <option value="CL-1042">Client A</option>
                <option value="CL-1187">Client B</option>
                <option value="CL-1220">Client C</option>
              </select>
            </label>
            <label>
              Note Type
              <select defaultValue="pacing">
                <option value="pacing">Pacing Note</option>
                <option value="observation">Observation</option>
                <option value="safety">Safety Boundary</option>
                <option value="integration">Integration Note</option>
              </select>
            </label>
            <label>
              Practitioner note
              <textarea
                readOnly
                value="Client is accurately identifying state shifts. Next review should protect pacing and avoid turning protocol completion into self-evaluation."
              />
            </label>
            <button className="button primary" type="button">
              Save Mock Note
            </button>
          </form>
        </div>
      </section>

      <section className="content-section" id="practitioner-resources">
        <SectionHeader
          eyebrow="Practitioner Resource Library"
          title="Implementation Materials"
          copy="Practitioner tools remain separate from client-facing resources and can later be tied to product purchase, organization license, or admin assignment."
        />
        <div className="resource-grid">
          {practitionerResources.map((resource) => (
            <ResourceCard resource={resource} role={role} key={resource.id} />
          ))}
        </div>
      </section>
    </>
  );
}
