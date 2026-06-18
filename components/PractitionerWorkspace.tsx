"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
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
import { supabase } from "@/lib/supabase/client";

type PractitionerClient = {
  relationshipId: string;
  clientId: string;
  clientName: string;
  protocolId: string | null;
  protocolTitle: string;
  consented: boolean;
  assignedAt: string;
};

type PractitionerNote = {
  id: string;
  clientName: string;
  protocolTitle: string;
  noteType: string;
  visibility: string;
  body: string;
  createdAt: string;
};

type PractitionerPayload = {
  clients?: PractitionerClient[];
  notes?: PractitionerNote[];
};

function formatVisibility(value: string) {
  if (value === "shared_with_client") return "Shared With Client";
  if (value === "admin_review") return "Admin Review";
  return "Practitioner Only";
}

export function PractitionerWorkspace({ role }: { role: Role }) {
  const access = usePortalAccess(role);
  const effectiveRole = access.role;
  const hasPractitionerAccess = !access.loading && access.canAccessPractitionerLayer;
  const practitionerResources = resources.filter((resource) => resource.access === "Practitioner");
  const [clients, setClients] = useState<PractitionerClient[]>([]);
  const [notes, setNotes] = useState<PractitionerNote[]>([]);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState("");
  const [noteType, setNoteType] = useState("Pacing Note");
  const [visibility, setVisibility] = useState("practitioner_only");
  const [noteBody, setNoteBody] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [noteMessage, setNoteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadPractitionerWorkspace() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setWorkspaceLoaded(true);
      return;
    }

    const response = await fetch("/.netlify/functions/practitioner-workspace", {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      setWorkspaceLoaded(true);
      return;
    }

    const payload = (await response.json()) as PractitionerPayload;
    const nextClients = payload.clients ?? [];
    setClients(nextClients);
    setNotes(payload.notes ?? []);
    setSelectedRelationshipId((current) => current || nextClients[0]?.relationshipId || "");
    setWorkspaceLoaded(true);
  }

  useEffect(() => {
    if (!hasPractitionerAccess) return;
    loadPractitionerWorkspace();
  }, [hasPractitionerAccess]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.relationshipId === selectedRelationshipId),
    [clients, selectedRelationshipId]
  );

  async function savePractitionerNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoteMessage(null);
    setSavePending(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setNoteMessage({ type: "error", text: "Log in to save practitioner notes." });
        return;
      }

      const response = await fetch("/.netlify/functions/save-practitioner-note", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          relationshipId: selectedRelationshipId,
          noteType,
          visibility,
          body: noteBody
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setNoteMessage({
          type: "error",
          text: payload?.error ?? "Practitioner note could not be saved."
        });
        return;
      }

      setNoteMessage({ type: "success", text: payload?.message ?? "Practitioner note saved." });
      setNoteBody("");
      await loadPractitionerWorkspace();
    } finally {
      setSavePending(false);
    }
  }

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
        <StatCard
          label="Assigned Clients"
          value={workspaceLoaded ? String(clients.length) : "Loading"}
          detail="Active practitioner-client relationships"
          tone="gold"
        />
        <StatCard
          label="Consented Clients"
          value={workspaceLoaded ? String(clients.filter((client) => client.consented).length) : "-"}
          detail="Client consent recorded"
          tone="blue"
        />
        <StatCard
          label="Practitioner Notes"
          value={workspaceLoaded ? String(notes.length) : "-"}
          detail="Recent practitioner observation records"
        />
        <StatCard label="Addenda" value="3" detail="Therapeutic integration material" tone="green" />
      </section>

      <section className="content-section" id="client-review">
        <SectionHeader
          eyebrow="Client Review View"
          title="Assigned Client Progress"
          copy="This view gives practitioners a structured readout without exposing sensitive private notes to the client dashboard."
        />
        {clients.length ? (
          <div className="client-review-grid">
            {clients.map((client) => (
              <article className="client-review-card" key={client.relationshipId}>
              <div className="card-topline">
                <span className="protocol-id">{client.protocolId ?? "Cross-Protocol"}</span>
                <span className="review-flag">{client.consented ? "Consented" : "Consent Needed"}</span>
              </div>
              <h3>{client.clientName}</h3>
              <p>{client.protocolTitle}</p>
              <dl>
                <div>
                  <dt>Relationship</dt>
                  <dd>Active</dd>
                </div>
                <div>
                  <dt>Consent</dt>
                  <dd>{client.consented ? "Recorded" : "Pending"}</dd>
                </div>
              </dl>
              <p>Assigned client record is available for practitioner review and note-taking.</p>
              <strong className="next-review">
                Assigned {new Date(client.assignedAt).toLocaleDateString()}
              </strong>
              </article>
            ))}
          </div>
        ) : (
          <article className="empty-state-panel">
            <h3>No assigned clients yet.</h3>
            <p>
              Assigned client records will appear here after an admin creates an active
              practitioner-client relationship.
            </p>
          </article>
        )}
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
          {notes.length ? (
            <div className="notes-list">
              {notes.map((note) => (
              <article className="note-card" key={note.id}>
                <div className="card-topline">
                  <span className="protocol-id">{note.id}</span>
                  <span className="note-status">{formatVisibility(note.visibility)}</span>
                </div>
                <h3>{note.clientName}</h3>
                <p>{note.protocolTitle}</p>
                <strong>{note.noteType}</strong>
                <p>{note.body}</p>
              </article>
              ))}
            </div>
          ) : (
            <article className="empty-state-panel">
              <h3>No practitioner notes yet.</h3>
              <p>Saved observation notes will appear here after the first assigned-client review.</p>
            </article>
          )}
          <form className="mock-form note-composer" onSubmit={savePractitionerNote}>
            <span className="eyebrow">Practitioner Note</span>
            <h3>New Practitioner Note</h3>
            <label>
              Client
              <select
                value={selectedRelationshipId}
                onChange={(event) => setSelectedRelationshipId(event.target.value)}
                disabled={!clients.length}
                required
              >
                {clients.length ? (
                  clients.map((client) => (
                    <option key={client.relationshipId} value={client.relationshipId}>
                      {client.clientName} - {client.protocolTitle}
                    </option>
                  ))
                ) : (
                  <option value="">No assigned clients</option>
                )}
              </select>
            </label>
            <label>
              Note Type
              <select value={noteType} onChange={(event) => setNoteType(event.target.value)}>
                <option value="Pacing Note">Pacing Note</option>
                <option value="Observation">Observation</option>
                <option value="Safety Boundary">Safety Boundary</option>
                <option value="Integration Note">Integration Note</option>
              </select>
            </label>
            <label>
              Visibility
              <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="practitioner_only">Practitioner Only</option>
                <option value="shared_with_client">Shared With Client</option>
                <option value="admin_review">Admin Review</option>
              </select>
            </label>
            <label>
              Practitioner note
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder={
                  selectedClient
                    ? `Write a structured review note for ${selectedClient.clientName}.`
                    : "Assign a client before saving practitioner notes."
                }
                disabled={!clients.length}
                required
              />
            </label>
            <button className="button primary" type="submit" disabled={!clients.length || savePending}>
              {savePending ? "Saving" : "Save Note"}
            </button>
            {noteMessage ? <p className={`form-message ${noteMessage.type}`}>{noteMessage.text}</p> : null}
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
