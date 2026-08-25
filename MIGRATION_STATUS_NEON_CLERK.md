# Distinct Character Portal Migration Status

## Objective

Replace Supabase with a more stable production setup while preserving the current portal business model.

Target architecture:

- Netlify remains the portal host and serverless function platform.
- WooCommerce remains the main checkout and sales engine.
- Neon replaces Supabase as the relational database.
- Clerk replaces Supabase Auth.
- Existing protocol, entitlement, purchase, practitioner, resource, and founder dashboard logic must be preserved.

## Reason For Migration

Supabase has become a poor fit for the founder's operating requirements because of:

- free-project pausing behavior;
- pricing structure concerns;
- bundled services that are not all needed;
- concern about reliability during scaling.

The goal is not to redesign the portal. The goal is to replace the backend foundation with a cleaner split of responsibilities.

## Recommended Stack

### Neon

Purpose:

- Postgres database.
- Stores protocol catalog, purchases, entitlements, progress, practitioner data, resources, order history, webhook events, and founder dashboard data.

Reason:

- Keeps the current relational data model.
- Allows most Supabase SQL concepts to be translated instead of fully redesigned.
- Better fit than Convex or Firebase for this portal's entitlement-heavy structure.

### Clerk

Purpose:

- User authentication.
- Email/password and low-friction account access.
- Replaces Supabase Auth sessions and user identity.

Reason:

- Auth-specialized platform.
- Good fit for customer portal login.
- Separates identity from database and checkout.

### Netlify

Purpose:

- Hosts Next.js portal.
- Runs backend functions.
- Receives WooCommerce and optional Stripe webhooks.

### WooCommerce

Purpose:

- Main product sales engine on the Distinct Character website.
- Sends paid order events to the portal backend.

## Migration Rule

Do not disconnect or delete Supabase until the Neon/Clerk version is built, deployed, and tested.

Migration must happen in parallel:

1. Keep current live portal intact.
2. Build Neon schema.
3. Build Clerk auth.
4. Update code.
5. Test Netlify deployment.
6. Confirm WooCommerce order unlock flow.
7. Only then stop relying on Supabase.

## Current Supabase Dependencies

### Frontend Auth Components

Files using Supabase browser auth:

- `components/AuthPanel.tsx`
- `components/AuthStatus.tsx`
- `components/PortalNav.tsx`
- `components/TermsAcceptanceGate.tsx`
- `components/ResetPasswordPanel.tsx`
- `app/auth/callback/page.tsx`
- `lib/supabase/client.ts`
- `lib/auth/profile-sync.ts`
- `lib/auth/purchase-claim.ts`
- `lib/auth/portal-access.ts`

These must move to Clerk.

### Frontend Session-Token Calls

Files using Supabase session tokens to call Netlify functions:

- `components/FounderOrdersDashboard.tsx`
- `components/PortalProtocolGrid.tsx`
- `components/PortalResourceGrid.tsx`
- `components/ProtectedResourceButton.tsx`
- `components/ProtocolCompletionPanel.tsx`
- `components/PurchaseClaimStatus.tsx`
- `components/RecentPracticeActivity.tsx`
- `components/SomaticResetLog.tsx`
- `components/PractitionerWorkspace.tsx`
- `components/PortalSummaryStats.tsx`

These must use Clerk session tokens instead.

### Netlify Functions Using Supabase Admin Client

Files using Supabase admin/server client:

- `netlify/functions/_shared/supabase-admin.ts`
- `netlify/functions/_shared/purchase-claim.ts`
- `netlify/functions/_shared/practitioner-access.ts`
- `netlify/functions/claim-purchases.ts`
- `netlify/functions/founder-orders.ts`
- `netlify/functions/mark-protocol-complete.ts`
- `netlify/functions/portal-access.ts`
- `netlify/functions/portal-catalog.ts`
- `netlify/functions/practitioner-workspace.ts`
- `netlify/functions/protected-resource.ts`
- `netlify/functions/save-practice-log.ts`
- `netlify/functions/save-practitioner-note.ts`
- `netlify/functions/stripe-webhook.ts`
- `netlify/functions/supabase-healthcheck.ts`
- `netlify/functions/woocommerce-webhook.ts`

These must be moved to Neon SQL plus Clerk JWT verification.

### Database Artifacts

Existing Supabase SQL lives under:

- `supabase/migrations`
- `supabase/manual`
- `supabase/dev`

These should be converted into:

- `neon/migrations`
- `neon/manual`
- `neon/dev`

## Core Tables To Preserve

The Neon schema must preserve the same business concepts:

- profiles
- user_role_assignments
- protocols
- protocol_prerequisites
- bundle_protocols
- protocol_phases
- resource_assets
- purchases
- protocol_entitlements
- protocol_progress
- assessment_logs
- practice_logs
- practitioner_profiles
- practitioner_client_relationships
- practitioner_notes
- cohorts
- cohort_memberships
- cohort_protocol_runs
- license_organizations
- license_memberships
- license_protocol_access
- webhook_events
- admin_audit_log
- woocommerce_product_mappings
- stripe_product_mappings, optional backup/direct links

## Required Code Changes

### Phase 1: Database Adapter

Create a server-side Neon database helper to replace Supabase admin calls.

Likely files:

- add `netlify/functions/_shared/neon.ts`
- add `lib/server/db.ts` if needed
- add `neon/migrations/0001_distinct_character_neon_schema.sql`

### Phase 2: Clerk Auth

Install Clerk packages and replace Supabase Auth.

Likely package changes:

- remove `@supabase/supabase-js` after migration completes;
- add Clerk dependency;
- add Neon/Postgres dependency.

Frontend changes:

- replace Supabase login panels with Clerk auth flow;
- update account/session display;
- update terms acceptance storage;
- update reset-password flow according to Clerk behavior.

### Phase 3: Backend Functions

Rewrite Netlify functions to:

- verify Clerk identity;
- query Neon directly;
- write purchases into Neon;
- claim access based on verified email;
- protect resource downloads;
- preserve founder dashboard.

### Phase 4: WooCommerce Webhook

Keep current WooCommerce purchase automation logic, but change writes from Supabase to Neon.

Required:

- WooCommerce webhook secret in Netlify;
- WooCommerce product mappings in Neon;
- paid statuses only: `processing`, `completed`;
- ignored statuses: `pending`, `failed`, `cancelled`, `refunded`, `on-hold`.

### Phase 5: Testing

Minimum required tests:

- production build passes;
- TypeScript passes;
- login works through Clerk;
- founder dashboard loads;
- WooCommerce webhook records a purchase;
- purchase claim unlocks correct protocol;
- bundle purchase unlocks child protocols;
- protected downloads still require entitlement;
- practice log saves;
- mark-complete workflow still expires access correctly;
- practitioner area remains locked unless entitled;
- terms gate still appears before portal use.

## Founder Steps Expected Later

These are account-level steps Codex cannot safely perform without dashboard access:

1. Create Neon account/project.
2. Create Clerk account/application.
3. Provide or paste environment variables into Netlify.
4. Run final Neon SQL if direct database access is not granted.
5. Configure WooCommerce webhook endpoint if endpoint changes.
6. Confirm first live customer purchase flow.

## Current Status

Date: 2026-08-24

Completed:

- Decision made to migrate away from Supabase.
- Replacement stack selected: Neon + Clerk.
- Initial Supabase dependency audit completed.
- Migration status file created.
- Neon migration folders created.
- Base Neon schema created at `neon/migrations/0001_distinct_character_neon_schema.sql`.
- Supabase Auth/RLS/service-role references removed from the Neon base schema package.
- WooCommerce Neon migration patched so it no longer uses Supabase RLS or `service_role`.
- `@clerk/nextjs` and `@neondatabase/serverless` installed.
- Supabase runtime package removed from the app.
- Portal UI auth moved from Supabase Auth to Clerk.
- Netlify functions moved from Supabase service-role access to Neon serverless queries plus Clerk token verification.
- WooCommerce and Stripe webhook handlers rewritten to write purchases into Neon.
- Protected downloads, purchase claiming, practice logs, protocol completion, practitioner workspace, and founder orders rewritten for Neon/Clerk.
- Runtime Supabase references removed from `app`, `components`, `lib`, `netlify/functions`, and `package.json`.
- TypeScript check passes.
- Production build passes.
- Neon/Clerk healthcheck added at `/.netlify/functions/neon-clerk-healthcheck`.
- Nontechnical setup checklist added at `docs/backend/neon-clerk-launch-checklist.md`.

In progress:

- Netlify environment variable changeover.
- Neon SQL execution.
- Clerk dashboard redirect setup.

Not started:

- Clerk/Neon production testing.

## Next Technical Step

Run the Neon SQL package, add the Clerk/Neon Netlify variables, deploy, then test the healthcheck and purchase claim flow.

Important:

- Keep the current Supabase-backed production portal intact until the Clerk/Neon version passes testing.
- Do not ask the founder to run dashboard steps until the code package is ready.
- Preserve WooCommerce as the primary checkout source.
- Preserve Stripe mapping support as optional backup/direct purchase path.
