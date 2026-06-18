"use client";

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
import { usePortalAccess } from "@/lib/auth/portal-access";
import { ResourceCard } from "@/components/ResourceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";

export function PractitionerWorkspace({ role }: { role: Role }) {
  const access = usePortalAccess(role);
  const effectiveRole = access.role;
  const hasPractitionerAccess = !access.loading && canViewPractitionerLayer(effectiveRole);
  const practitionerResources = resources.filter((resource) => resource.access === "Practitioner");

  if (!hasPractitionerAccess) {
    return (
      <section className="content-section">
        <article className="locked-workspace">
          <span className="eyebrow">Practitioner Layer</span>
          <h1>Therapeutic integration workspace is locked.</h1>
          <p>
            This layer is reserved for approved practitioner access. Client accounts can continue
            protocols and download permitted resources, while practitioner review tools and
            therapeutic addenda remain protected.
          </p>
          <div className="lock-grid">
            <div>
              <strong>Practitioner Access</strong>
              <span>{access.loading ? "Confirming practitioner access." : practitionerAccessReason(effectiveRole)}</span>
            </div>
            <div>
              <strong>Practitioner Tools</strong>
              <span>Client review queue, practitioner resource library, therapeutic addenda.</span>
            </div>
            <div>
              <strong>Professional Materials</strong>
              <span>Advanced review materials remain separate from client access.</span>
            </div>
          </div>
          <div className="hero-actions">
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
            addenda, and document practice notes without exposing clinical-adjacent guidance
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
          <span className="eyebrow">Practitioner Workspace</span>
          <strong>Practitioner access active</strong>
          <p>{practitionerAccessReason(effectiveRole)}</p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{effectiveRole}</dd>
            </div>
            <div>
              <dt>Client Review</dt>
              <dd>{canReviewClients(effectiveRole) ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Notes Workflow</dt>
              <dd>{canManagePractitionerNotes(effectiveRole) ? "Enabled" : "Read Only"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="stat-grid" aria-label="Practitioner summary">
        <StatCard label="Assigned Clients" value="3" detail="Practice cohort" tone="gold" />
        <StatCard label="Needs Review" value="1" detail="Capacity and pacing check recommended" tone="blue" />
        <StatCard label="Practitioner Notes" value="3" detail="Draft, shared, and practitioner-only states" />
        <StatCard label="Addenda" value="3" detail="Therapeutic integration material" tone="green" />
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
          title="Therapeutic Integration Guidance"
          copy="Addenda are visible only when practitioner access is active. They support pacing, safety boundaries, observation, and referral awareness."
        />
        <div className="addenda-list">
          {canViewTherapeuticAddenda(effectiveRole) &&
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
          copy="Practitioner notes separate private observation from client-visible feedback."
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
            <span className="eyebrow">Practitioner Note</span>
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
              Save Note
            </button>
          </form>
        </div>
      </section>

      <section className="content-section" id="practitioner-resources">
        <SectionHeader
          eyebrow="Practitioner Resource Library"
          title="Professional Materials"
          copy="Practitioner tools remain separate from client-facing resources and support review, pacing, and educational boundaries."
        />
        <div className="resource-grid">
          {practitionerResources.map((resource) => (
            <ResourceCard resource={resource} role={effectiveRole} key={resource.id} />
          ))}
        </div>
      </section>
    </>
  );
}
