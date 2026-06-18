"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PracticeLogRow = {
  id: string;
  protocol_id: string;
  practice_key: string;
  state_before: string | null;
  state_after: string | null;
  context_note: string | null;
  created_at: string;
};

type PortalCatalogPayload = {
  practiceLogs?: PracticeLogRow[];
};

function formatPractice(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function RecentPracticeActivity() {
  const [logs, setLogs] = useState<PracticeLogRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (mounted) setLoaded(true);
        return;
      }

      const response = await fetch("/.netlify/functions/portal-catalog", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!mounted) return;

      if (!response.ok) {
        setLoaded(true);
        return;
      }

      const payload = (await response.json()) as PortalCatalogPayload;
      setLogs(payload.practiceLogs ?? []);
      setLoaded(true);
    }

    loadActivity();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <article className="activity-panel">
      <div className="section-header compact">
        <span className="eyebrow">Practice Activity</span>
        <h2>Recent Regulation Logs</h2>
        <p>Saved protocol practice appears here for continuity between sessions.</p>
      </div>

      {!loaded ? (
        <p className="activity-empty">Loading recent activity.</p>
      ) : logs.length ? (
        <div className="activity-list">
          {logs.map((log) => (
            <article className="activity-item" key={log.id}>
              <div>
                <strong>{formatPractice(log.practice_key)}</strong>
                <small>{formatDate(log.created_at)}</small>
              </div>
              <p>{log.context_note}</p>
              <span>
                {log.state_before} to {log.state_after}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="activity-empty">No saved practice logs yet.</p>
      )}
    </article>
  );
}
