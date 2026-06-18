"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ProtectedResourceButtonProps = {
  href?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

function fileNameFromHref(href: string) {
  const cleanHref = href.split("?")[0];
  const parts = cleanHref.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function ProtectedResourceButton({
  href,
  label = "Open",
  className = "button secondary",
  disabled = false
}: ProtectedResourceButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function openResource() {
    setMessage("");

    if (!href) return;

    const fileName = fileNameFromHref(href);

    if (!fileName) {
      setMessage("This resource is not available.");
      return;
    }

    setPending(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.assign("/login");
        return;
      }

      const response = await fetch(
        `/.netlify/functions/protected-resource?file=${encodeURIComponent(fileName)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "This resource is not available for this account.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className={className} type="button" disabled={disabled || pending || !href} onClick={openResource}>
        {pending ? "Opening" : label}
      </button>
      {message ? <span className="resource-button-message">{message}</span> : null}
    </>
  );
}
