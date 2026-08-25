"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type FounderOrder = {
  id: string;
  email: string;
  productName: string;
  amountTotal: number | null;
  currency: string | null;
  source: string;
  purchasedAt: string;
  claimedAt: string | null;
  emailVerifiedBeforeClaim: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  woocommerceOrderId: string | null;
  woocommerceProductId: string | null;
  woocommerceVariationId: string | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    primary_role: string;
    last_login_at: string | null;
  } | null;
  entitlements: Array<{
    protocol_id: string | null;
    entitlement_type: string;
    status: string;
    created_at: string;
    expires_at: string | null;
  }>;
};

type WebhookEvent = {
  provider_event_id: string;
  event_type: string;
  processing_status: string;
  created_at: string;
  processed_at: string | null;
};

type FounderOrdersPayload = {
  ok: boolean;
  summary: {
    totalOrders: number;
    claimedOrders: number;
    unclaimedOrders: number;
    totalRevenue: number;
    currency: string;
    lastPurchaseAt: string | null;
  };
  orders: FounderOrder[];
  recentWebhookEvents: WebhookEvent[];
};

function formatMoney(cents: number | null, currency: string | null) {
  if (cents === null) return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase()
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function cleanLabel(value: string) {
  return value
    .replace(/^protocol_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function entitlementSummary(order: FounderOrder) {
  if (!order.entitlements.length) return "No entitlement recorded";
  return order.entitlements
    .map((entitlement) =>
      [entitlement.protocol_id, cleanLabel(entitlement.entitlement_type), cleanLabel(entitlement.status)]
        .filter(Boolean)
        .join(" · ")
    )
    .join("; ");
}

function sourceLabel(source: string) {
  if (source === "woocommerce_checkout") return "WooCommerce";
  if (source.startsWith("stripe")) return "Stripe";
  return cleanLabel(source);
}

export function FounderOrdersDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [payload, setPayload] = useState<FounderOrdersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");

    if (!isLoaded) return;

    if (!isSignedIn) {
      setError("Sign in with an admin account to view founder orders.");
      setLoading(false);
      return;
    }

    const token = await getToken();

    const response = await fetch("/.netlify/functions/founder-orders", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Founder orders could not be loaded.");
      setLoading(false);
      return;
    }

    setPayload(body as FounderOrdersPayload);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, [isLoaded, isSignedIn]);

  const failedWebhookCount = useMemo(
    () => payload?.recentWebhookEvents.filter((event) => event.processing_status === "failed").length ?? 0,
    [payload]
  );

  if (loading) {
    return (
      <section className="founder-orders-panel">
        <span className="eyebrow">Founder Orders</span>
        <h2>Loading order records.</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="founder-orders-panel">
        <span className="eyebrow">Founder Access</span>
        <h2>Orders are restricted.</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!payload) return null;

  return (
    <div className="founder-orders">
      <section className="stat-grid founder-stat-grid">
        <article className="stat-card gold">
          <span>Total Orders</span>
          <strong>{payload.summary.totalOrders}</strong>
          <p>Recorded in Neon from website checkout events.</p>
        </article>
        <article className="stat-card green">
          <span>Claimed Access</span>
          <strong>{payload.summary.claimedOrders}</strong>
          <p>Orders matched to a portal account.</p>
        </article>
        <article className="stat-card blue">
          <span>Unclaimed Orders</span>
          <strong>{payload.summary.unclaimedOrders}</strong>
          <p>Purchases waiting for the client to log in with the checkout email.</p>
        </article>
        <article className="stat-card">
          <span>Recorded Revenue</span>
          <strong>{formatMoney(payload.summary.totalRevenue, payload.summary.currency)}</strong>
          <p>Based on currently loaded order records.</p>
        </article>
      </section>

      <section className="founder-orders-panel">
        <div className="founder-panel-header">
          <div>
            <span className="eyebrow">Order Records</span>
            <h2>Client Purchases</h2>
            <p>Review recorded orders, account claim status, and access records.</p>
          </div>
          <button className="button secondary" type="button" onClick={loadOrders}>
            Refresh
          </button>
        </div>

        <div className="orders-table" role="table" aria-label="Founder order records">
          <div className="orders-row header" role="row">
            <span>Client</span>
            <span>Product</span>
            <span>Amount</span>
            <span>Purchased</span>
            <span>Status</span>
          </div>
          {payload.orders.map((order) => (
            <div className="orders-row" role="row" key={order.id}>
              <span>
                <strong>{order.email}</strong>
                <small>{order.profile?.full_name || order.profile?.primary_role || "Account not claimed"}</small>
              </span>
              <span>
                <strong>{cleanLabel(order.productName)}</strong>
                <small>{sourceLabel(order.source)} · {entitlementSummary(order)}</small>
              </span>
              <span>{formatMoney(order.amountTotal, order.currency)}</span>
              <span>{formatDate(order.purchasedAt)}</span>
              <span>
                <mark className={`order-status ${order.claimedAt ? "claimed" : "unclaimed"}`}>
                  {order.claimedAt ? "Claimed" : "Unclaimed"}
                </mark>
                <small>{order.claimedAt ? formatDate(order.claimedAt) : "Awaiting matching login"}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="founder-orders-panel">
        <div className="founder-panel-header">
          <div>
            <span className="eyebrow">Payment Automation</span>
            <h2>Recent Payment Webhook Events</h2>
            <p>{failedWebhookCount ? `${failedWebhookCount} recent event needs review.` : "Recent events are clear."}</p>
          </div>
        </div>
        <div className="webhook-list">
          {payload.recentWebhookEvents.map((event) => (
            <div className="webhook-item" key={event.provider_event_id}>
              <span>
                <strong>{event.event_type}</strong>
                <small>{event.provider_event_id}</small>
              </span>
              <mark className={`order-status ${event.processing_status}`}>{cleanLabel(event.processing_status)}</mark>
              <span>{formatDate(event.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
