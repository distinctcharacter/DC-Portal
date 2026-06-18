"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

const PRACTICE_OPTIONS = [
  { value: "physiological-sigh", label: "Physiological Sigh" },
  { value: "humming-vagal-vibration", label: "Humming / Vagal Vibration" },
  { value: "sensory-anchoring", label: "Sensory Anchoring" },
  { value: "orientation-practice", label: "Orientation Practice" },
  { value: "paced-exhale", label: "Paced Exhale" }
];

const STATE_OPTIONS = [
  "Zone 1: Ventral",
  "Zone 2: Sympathetic",
  "Zone 3: Dorsal",
  "Mixed activation",
  "Unclear / still assessing"
];

export function SomaticResetLog() {
  const [contextNote, setContextNote] = useState("");
  const [practiceKey, setPracticeKey] = useState(PRACTICE_OPTIONS[0].value);
  const [stateBefore, setStateBefore] = useState(STATE_OPTIONS[1]);
  const [stateAfter, setStateAfter] = useState(STATE_OPTIONS[0]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function submitLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage({
          type: "error",
          text: "Log in to save this practice entry to your portal record."
        });
        return;
      }

      const response = await fetch("/.netlify/functions/save-practice-log", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contextNote,
          practiceKey,
          stateBefore,
          stateAfter
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setMessage({
          type: "error",
          text: payload?.error ?? "This practice log could not be saved."
        });
        return;
      }

      setMessage({
        type: "success",
        text: payload?.message ?? "Practice log saved."
      });
      setContextNote("");
      setPracticeKey(PRACTICE_OPTIONS[0].value);
      setStateBefore(STATE_OPTIONS[1]);
      setStateAfter(STATE_OPTIONS[0]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mock-form practice-log-form" onSubmit={submitLog}>
      <label>
        Trigger or context
        <textarea
          value={contextNote}
          onChange={(event) => setContextNote(event.target.value)}
          placeholder="Name the condition, cue, or demand that activated the system."
          required
        />
      </label>
      <div className="form-grid-two">
        <label>
          Before-state
          <select value={stateBefore} onChange={(event) => setStateBefore(event.target.value)} required>
            {STATE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          After-state
          <select value={stateAfter} onChange={(event) => setStateAfter(event.target.value)} required>
            {STATE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Protocol selected
        <select value={practiceKey} onChange={(event) => setPracticeKey(event.target.value)} required>
          {PRACTICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving" : "Save Log"}
      </button>
      {message ? <p className={`form-message ${message.type}`}>{message.text}</p> : null}
    </form>
  );
}
