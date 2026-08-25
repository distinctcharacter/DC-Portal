"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

type Finding = {
  severity: "critical" | "warning" | "ok";
  message: string;
};

type AuditPayload = {
  ok: boolean;
  checkedAt: string;
  environment: {
    hasDatabaseUrl: boolean;
    hasWooCommerceWebhookSecret: boolean;
    hasClerkSecretKey: boolean;
    database: Record<string, unknown> | null;
  };
  signedInAccount: {
    id: string;
    email: string;
    emailNormalized: string;
    profile: Record<string, unknown> | null;
    roles: Array<Record<string, unknown>>;
  };
  access: {
    accessibleProtocolIds: string[];
    entitlements: Array<Record<string, unknown>>;
    progress: Array<Record<string, unknown>>;
  };
  purchaseMatching: {
    purchases: Array<Record<string, unknown>>;
    purchasesWithMapping: Array<{
      purchase: Record<string, unknown>;
      mapping: Record<string, unknown> | null;
    }>;
  };
  woocommerce: {
    mappings: Array<Record<string, unknown>>;
    recentWebhookEvents: Array<Record<string, unknown>>;
  };
  protocols: Array<Record<string, unknown>>;
  findings: Finding[];
};

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function productLabel(row: Record<string, unknown>) {
  const displayName = row.product_display_name ? String(row.product_display_name) : "";
  const internalKey = row.internal_product_key ? String(row.internal_product_key) : "";
  const productId = row.woocommerce_product_id ? String(row.woocommerce_product_id) : "";
  return displayName || internalKey || productId || "Not recorded";
}

function statusClass(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("processed") || normalized.includes("active") || normalized.includes("ok")) return "processed";
  if (normalized.includes("failed") || normalized.includes("critical")) return "failed";
  return "received";
}

export function FounderSystemAuditDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [payload, setPayload] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAudit() {
    setLoading(true);
    setError("");

    if (!isLoaded) return;

    if (!isSignedIn) {
      setError("Sign in with the founder account to view the system audit.");
      setLoading(false);
      return;
    }

    const token = await getToken();
    const response = await fetch("/.netlify/functions/founder-system-audit", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "System audit could not be loaded.");
      setLoading(false);
      return;
    }

    setPayload(body as AuditPayload);
    setLoading(false);
  }

  useEffect(() => {
    loadAudit();
  }, [isLoaded, isSignedIn]);

  const summary = useMemo(
    () => ({
      purchases: payload?.purchaseMatching.purchases.length ?? 0,
      accessIds: payload?.access.accessibleProtocolIds.length ?? 0,
      mappings: payload?.woocommerce.mappings.length ?? 0,
      webhooks: payload?.woocommerce.recentWebhookEvents.length ?? 0
    }),
    [payload]
  );

  if (loading) {
    return (
      <section className="founder-orders-panel">
        <span className="eyebrow">System Audit</span>
        <h2>Checking portal access flow.</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="founder-orders-panel">
        <span className="eyebrow">Founder Access</span>
        <h2>System audit is restricted.</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!payload) return null;

  return (
    <div className="founder-orders system-audit">
      <section className="stat-grid founder-stat-grid">
        <article className="stat-card gold">
          <span>Purchases For This Email</span>
          <strong>{summary.purchases}</strong>
          <p>{payload.signedInAccount.emailNormalized}</p>
        </article>
        <article className="stat-card green">
          <span>Active Protocol IDs</span>
          <strong>{summary.accessIds}</strong>
          <p>{payload.access.accessibleProtocolIds.join(", ") || "None found"}</p>
        </article>
        <article className="stat-card blue">
          <span>WooCommerce Mappings</span>
          <strong>{summary.mappings}</strong>
          <p>Product IDs available for access matching.</p>
        </article>
        <article className="stat-card">
          <span>Recent Webhooks</span>
          <strong>{summary.webhooks}</strong>
          <p>Latest WooCommerce delivery records.</p>
        </article>
      </section>

      <section className="founder-orders-panel">
        <div className="founder-panel-header">
          <div>
            <span className="eyebrow">Findings</span>
            <h2>Access Flow Status</h2>
            <p>Use this section first. It identifies the exact layer blocking access.</p>
          </div>
          <button className="button secondary" type="button" onClick={loadAudit}>
            Refresh Audit
          </button>
        </div>
        <div className="audit-finding-list">
          {payload.findings.map((finding) => (
            <article className={`audit-finding ${finding.severity}`} key={finding.message}>
              <mark className={`order-status ${statusClass(finding.severity)}`}>{finding.severity}</mark>
              <p>{finding.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="founder-orders-panel">
        <span className="eyebrow">Signed-In Account</span>
        <h2>Account Match</h2>
        <div className="audit-key-grid">
          <span>Email</span>
          <strong>{payload.signedInAccount.email}</strong>
          <span>Normalized Email</span>
          <strong>{payload.signedInAccount.emailNormalized}</strong>
          <span>Profile ID</span>
          <strong>{payload.signedInAccount.id}</strong>
          <span>Database Connected</span>
          <strong>{payload.environment.hasDatabaseUrl ? "Yes" : "No"}</strong>
          <span>WooCommerce Secret Present</span>
          <strong>{payload.environment.hasWooCommerceWebhookSecret ? "Yes" : "No"}</strong>
        </div>
      </section>

      <section className="founder-orders-panel">
        <span className="eyebrow">Purchase Matching</span>
        <h2>Purchases Found For This Email</h2>
        <div className="orders-table audit-table">
          <div className="orders-row header" role="row">
            <span>Order</span>
            <span>Product</span>
            <span>Mapping</span>
            <span>Claimed</span>
            <span>Purchased</span>
          </div>
          {payload.purchaseMatching.purchasesWithMapping.length ? (
            payload.purchaseMatching.purchasesWithMapping.map(({ purchase, mapping }) => (
              <div className="orders-row" role="row" key={valueText(purchase.id)}>
                <span>
                  <strong>{valueText(purchase.woocommerce_order_id || purchase.stripe_product_id)}</strong>
                  <small>{valueText(purchase.source)}</small>
                </span>
                <span>
                  <strong>{valueText(purchase.woocommerce_product_id || purchase.stripe_price_id)}</strong>
                  <small>Variation: {valueText(purchase.woocommerce_variation_id)}</small>
                </span>
                <span>
                  <strong>{mapping ? productLabel(mapping) : "No mapping found"}</strong>
                  <small>{mapping ? valueText(mapping.protocol_id) : "Check WooCommerce product ID"}</small>
                </span>
                <span>{purchase.claimed_at ? "Yes" : "No"}</span>
                <span>{formatDate(purchase.purchased_at)}</span>
              </div>
            ))
          ) : (
            <div className="empty-audit-row">No purchase rows match the signed-in email.</div>
          )}
        </div>
      </section>

      <section className="founder-orders-panel">
        <span className="eyebrow">WooCommerce Events</span>
        <h2>Recent Webhook Processing</h2>
        <div className="webhook-list">
          {payload.woocommerce.recentWebhookEvents.length ? (
            payload.woocommerce.recentWebhookEvents.map((event) => (
              <div className="webhook-item audit-webhook-item" key={valueText(event.provider_event_id)}>
                <span>
                  <strong>{valueText(event.event_type)}</strong>
                  <small>{valueText(event.provider_event_id)}</small>
                </span>
                <mark className={`order-status ${statusClass(event.processing_status)}`}>
                  {valueText(event.processing_status)}
                </mark>
                <span>
                  {formatDate(event.created_at)}
                  <small>Email: {valueText(event.billingEmail)}</small>
                  <small>Items: {valueText(event.lineItems)}</small>
                </span>
              </div>
            ))
          ) : (
            <div className="empty-audit-row">No WooCommerce webhook events are visible in this database.</div>
          )}
        </div>
      </section>

      <section className="founder-orders-panel">
        <span className="eyebrow">Product Mapping</span>
        <h2>WooCommerce Product IDs</h2>
        <div className="mapping-grid">
          {payload.woocommerce.mappings.map((mapping) => (
            <article className="mapping-card" key={`${mapping.woocommerce_product_id}-${mapping.internal_product_key}`}>
              <strong>{productLabel(mapping)}</strong>
              <span>Woo ID: {valueText(mapping.woocommerce_product_id)}</span>
              <span>Protocol: {valueText(mapping.protocol_id)}</span>
              <span>Type: {valueText(mapping.entitlement_type)}</span>
              <span>Child access: {valueText(mapping.grant_child_protocols)}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
