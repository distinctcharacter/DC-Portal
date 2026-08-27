"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePortalAccess } from "@/lib/auth/portal-access";

const TERMS_VERSION = "dc-portal-terms-v2-2025";

const termsSections = [
  {
    title: "Copyright Notice",
    body: [
      "All content within the Distinct Character Protocol Portal, including but not limited to frameworks, protocols, companion documents, printable materials, implementation guides, and progress tools, is the exclusive intellectual property of the A. Solenne Institute and is protected under applicable copyright law.",
      "Purchase grants the buyer a non-transferable, non-exclusive license to access and use the purchased protocol for personal implementation only. This license does not transfer any ownership rights. All rights not explicitly granted are reserved."
    ]
  },
  {
    title: "Prohibited Uses",
    body: [
      "The following are strictly prohibited without prior written authorization from the A. Solenne Institute."
    ],
    items: [
      "No portal content may be reproduced, copied, printed in bulk, distributed, resold, sublicensed, or transferred to any third party in any digital or physical format.",
      "The portal environment, structure, architecture, delivery format, and content organization may not be duplicated, replicated, reverse engineered, or used as a model or template for another product, platform, or service.",
      "Portal access credentials are issued to the purchasing client only. Credentials may not be shared, transferred, sold, or made accessible to any other individual.",
      "No portal content may be entered into, uploaded to, processed by, or used to train any artificial intelligence tool, language model, machine learning system, or automated content generation platform.",
      "No content, screenshots, recordings, excerpts, paraphrases, or representations of portal content may be shared on social media, public forums, community groups, online course platforms, newsletters, podcasts, or any public or semi-public channel without written permission.",
      "Portal content may not be screen recorded, photographed, audio recorded, or captured in any format.",
      "Clients may not create frameworks, products, curricula, programs, courses, or commercial or non-commercial content derived from, substantially informed by, modeled after, or built upon portal content."
    ]
  },
  {
    title: "Confidentiality and Security",
    body: [
      "All portal content is confidential and intended solely for the purchasing client. Clients may not disclose, discuss, or share the substance, structure, or methodology of portal materials with any third party in a manner that reproduces or substantially represents the proprietary content contained within.",
      "Any attempt to introduce, deploy, or transmit spyware, malware, viruses, ransomware, tracking software, or malicious code into or through the portal environment is strictly prohibited. Attempts to access unauthorized areas of the portal, extract source code, interfere with portal infrastructure, or compromise platform security will be pursued accordingly."
    ]
  },
  {
    title: "Permission Requests",
    body: [
      "Any use of portal content outside of personal implementation requires prior written authorization. Permission requests must be submitted to inquires@asolenneinstitute.com and must specify the intended use, format, audience, and platform. Permission is granted at the sole discretion of the A. Solenne Institute and is not implied by purchase."
    ]
  },
  {
    title: "Framework Origin and Enforcement",
    body: [
      "All frameworks delivered through the Distinct Character Protocol Portal are developed by the A. Solenne Institute and maintained in the canonical archive of The Sovereign Bureau. Distinct Character is the applied delivery division through which these frameworks are made accessible to clients.",
      "Violation of any term within this notice may result in immediate and permanent revocation of portal access without refund, civil action for intellectual property infringement, and pursuit of damages to the fullest extent permitted by law."
    ]
  }
];

type GateStatus = "checking" | "guest" | "required" | "accepted";

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  const portalAccess = usePortalAccess();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) {
      setStatus("checking");
      return;
    }

    if (!isSignedIn) {
      setStatus("guest");
      return;
    }

    if (user?.publicMetadata?.dc_terms_version === TERMS_VERSION) {
      setStatus("accepted");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    async function loadAcceptance() {
      try {
        const token = await getToken();
        const response = await fetch("/.netlify/functions/accept-terms", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const payload = (await response.json()) as { accepted?: boolean };

        if (!response.ok) throw new Error("Terms status could not be confirmed.");
        if (!cancelled) setStatus(payload.accepted ? "accepted" : "required");
      } catch {
        if (!cancelled) setStatus("required");
      }
    }

    void loadAcceptance();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, user?.publicMetadata]);

  async function acceptTerms() {
    if (!checked || saving) return;

    setSaving(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch("/.netlify/functions/accept-terms", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error("Terms acknowledgment could not be saved.");

    } catch {
      setError("The acknowledgment could not be saved. Please refresh and try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setStatus("accepted");
    router.refresh();
  }

  if (status === "checking") {
    return (
      <section className="terms-gate" aria-live="polite">
        <div className="terms-panel compact">
          <span className="eyebrow">Portal Access</span>
          <h1>Preparing your private workspace.</h1>
          <p>Your account access is being confirmed.</p>
        </div>
      </section>
    );
  }

  if (status === "guest") {
    return (
      <section className="terms-gate">
        <div className="terms-panel compact">
          <span className="eyebrow">Portal Access Required</span>
          <h1>Sign in to continue.</h1>
          <p>Use the same email connected to your purchase to enter the Distinct Character Protocol Portal.</p>
          <Link className="button" href="/login">
            Login
          </Link>
        </div>
      </section>
    );
  }

  if (status === "accepted") {
    if (portalAccess.loading) {
      return (
        <section className="terms-gate" aria-live="polite">
          <div className="terms-panel compact">
            <span className="eyebrow">Portal Access</span>
            <h1>Preparing your private workspace.</h1>
            <p>Your current product access is being confirmed.</p>
          </div>
        </section>
      );
    }

    if (!portalAccess.hasActivePortalAccess) {
      return (
        <section className="terms-gate">
          <div className="terms-panel compact">
            <span className="eyebrow">Access Window Complete</span>
            <h1>Portal access is not currently active.</h1>
            <p>
              This account does not have an active Distinct Character product window. Use the same
              purchase email to claim a new product, or return to the Distinct Character website to
              continue with another protocol.
            </p>
            <div className="terms-actions">
              <Link className="button" href="/access/claim">
                Claim Product Access
              </Link>
              <Link className="button secondary" href="https://distinctcharacter.com">
                Visit Website
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return <>{children}</>;
  }

  return (
    <section className="terms-gate">
      <div className="terms-panel">
        <div className="terms-panel-header">
          <span className="eyebrow">Required Acknowledgment</span>
          <h1>Distinct Character Protocol Portal Terms of Use</h1>
          <p>
            Before entering the portal, review and acknowledge the terms that govern use of the
            protocols, resources, progress tools, and implementation materials.
          </p>
        </div>

        <div className="terms-scroll" tabIndex={0} aria-label="Distinct Character portal terms">
          {termsSections.map((section) => (
            <section className="terms-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          <p className="terms-footer">
            The Sovereign Bureau · A. Solenne Institute · A division of Granite Field Holdings Ltd. Co.
            Distinct Character · Copyright 2025 · All rights reserved.
          </p>
        </div>

        <label className="terms-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>I have read and agree to the Distinct Character Protocol Portal terms of use.</span>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="terms-actions">
          <button className="button" type="button" onClick={acceptTerms} disabled={!checked || saving}>
            {saving ? "Saving acknowledgment" : "Accept and Enter Portal"}
          </button>
        </div>
      </div>
    </section>
  );
}

