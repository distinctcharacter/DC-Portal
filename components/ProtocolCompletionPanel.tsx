"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type ProtocolCompletionPanelProps = {
  protocolId: string;
  protocolTitle: string;
};

type CatalogProgressRow = {
  protocol_id: string;
  completion_percent: number;
  completed_at?: string | null;
};

type CatalogPayload = {
  progress?: CatalogProgressRow[];
};

type CompletionResponse = {
  ok?: boolean;
  completedAt?: string;
  closeoutEndsAt?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function ProtocolCompletionPanel({ protocolId, protocolTitle }: ProtocolCompletionPanelProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [closeoutEndsAt, setCloseoutEndsAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCompletionStatus() {
      if (!isLoaded || !isSignedIn) return;
      const token = await getToken();

      if (!token) return;

      const response = await fetch("/.netlify/functions/portal-catalog", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!mounted || !response.ok) return;

      const payload = (await response.json()) as CatalogPayload;
      const progress = payload.progress?.find((row) => row.protocol_id === protocolId);

      if (progress?.completed_at) {
        const closeoutDate = new Date(progress.completed_at);
        closeoutDate.setDate(closeoutDate.getDate() + 7);
        setCompletedAt(progress.completed_at);
        setCloseoutEndsAt(closeoutDate.toISOString());
      }
    }

    loadCompletionStatus();

    return () => {
      mounted = false;
    };
  }, [getToken, isLoaded, isSignedIn, protocolId]);

  async function markComplete() {
    if (!confirmed || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    const token = await getToken();

    if (!token) {
      setError("Please sign in again before marking the protocol complete.");
      setSaving(false);
      return;
    }

    const response = await fetch("/.netlify/functions/mark-protocol-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ protocolId })
    });

    const payload = (await response.json()) as CompletionResponse;

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Protocol completion could not be saved.");
      setSaving(false);
      return;
    }

    setCompletedAt(payload.completedAt ?? null);
    setCloseoutEndsAt(payload.closeoutEndsAt ?? null);
    setMessage("Protocol completion has been recorded.");
    setSaving(false);
  }

  const alreadyComplete = Boolean(completedAt);

  return (
    <section className="tool-panel completion-panel">
      <div>
        <span className="eyebrow">Formal Completion</span>
        <h2>Complete {protocolTitle}</h2>
        {alreadyComplete ? (
          <p>
            This protocol was formally completed on {formatDate(completedAt)}. Portal access for
            this product remains available through {formatDate(closeoutEndsAt)}.
          </p>
        ) : (
          <p>
            Use this only when the protocol process is complete. Completion starts the seven-day
            closeout window for review, final downloads, and personal record keeping.
          </p>
        )}
      </div>

      {alreadyComplete ? (
        <p className="form-message success">Completion is recorded for this protocol.</p>
      ) : (
        <>
          <label className="completion-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I confirm that I have completed the protocol process and understand that this starts
              the seven-day closeout access period.
            </span>
          </label>
          {message ? <p className="form-message success">{message}</p> : null}
          {error ? <p className="form-message error">{error}</p> : null}
          <button className="button primary" type="button" onClick={markComplete} disabled={!confirmed || saving}>
            {saving ? "Saving Completion" : "Mark Protocol Complete"}
          </button>
        </>
      )}
    </section>
  );
}
