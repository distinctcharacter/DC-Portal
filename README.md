# Distinct Character Protocol Portal MVP Prototype

This is a rough structural prototype for the Distinct Character Protocol Portal.

It is not production-ready. It exists to review the user experience, information architecture, protocol navigation, resource library structure, locked/unlocked states, and portal shell before the backend is implemented.

## What Is Included

- Next.js App Router scaffold
- Dashboard homepage
- Mock protocol library
- Locked and unlocked protocol cards
- One mocked protocol page: Somatic Baseline Protocol
- Resource Library
- Download Center
- Practitioner Layer buildout with locked and unlocked mock access states
- Client review view for practitioner sessions
- Practitioner-only therapeutic addenda preview
- Practitioner notes and review workflow mockup
- Practitioner resource library
- Masterclass Series placeholder
- Progress tracker mockup
- Mobile responsive layout
- Supabase-ready code organization, without a Supabase connection
- Mock authentication and access state

## What Is Not Included

- Real authentication
- Supabase connection
- Stripe or checkout
- Real user data
- Real PDF download files
- Production deployment
- Full licensing infrastructure

## Local Setup

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Build check:

```bash
npm run build
```

Type check:

```bash
npm run typecheck
```

## Folder Structure

```txt
app/
  layout.tsx
  page.tsx
  globals.css
  practitioner/page.tsx
  protocols/[slug]/page.tsx
components/
  AccessBadge.tsx
  AppShell.tsx
  DownloadTable.tsx
  ProgressTracker.tsx
  ProtocolCard.tsx
  PractitionerWorkspace.tsx
  ResourceCard.tsx
  SectionHeader.tsx
  StatCard.tsx
data/
  mock.ts
lib/
  access.ts
protocol-asset-register.md
netlify.toml
```

## Mock Access Model

The prototype uses local mock data in `data/mock.ts`.

Current mock state:

- Somatic Baseline Protocol is in progress.
- Cognitive Architecture and later protocols are locked.
- Enterprise IP Mastermind is marked as future.
- Practitioner-only assets appear locked to the mock client.
- `/practitioner` shows the locked practitioner state for a client account.
- `/practitioner?access=practitioner` previews an active practitioner entitlement.
- `/protocols/somatic-baseline?access=practitioner` previews the role-gated SBP therapeutic addendum inside the protocol page.

Access logic lives in `lib/access.ts`.

Practitioner preview includes:

- Assigned client progress cards
- Risk/pacing flags
- Therapeutic addenda
- Private, shared, and draft note states
- Mock note composer
- Practitioner-only resource library

## Netlify Compatibility Notes

The project includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

When deploying later:

- Connect the GitHub repo to Netlify.
- Set the production domain to `portal.distinctcharacter.com`.
- Add environment variables for Supabase and payment providers only when backend work begins.

## Future Supabase Integration Notes

Backend-ready architecture has been generated in:

- `docs/backend/backend-architecture.md`
- `docs/backend/roles-permissions-model.md`
- `docs/backend/purchase-to-access-mapping.md`
- `docs/backend/stripe-webhook-architecture.md`
- `docs/backend/mock-to-real-auth-migration.md`
- `docs/backend/supabase-dev-execution-checklist.md`
- `docs/backend/supabase-auth-dev-test-checklist.md`
- `supabase/migrations/0001_distinct_character_backend_architecture.sql`
- `supabase/migrations/0002_seed_protocol_catalog_and_mapping_placeholders.sql`
- `supabase/dev/0003_mock_structure_smoke_test.sql`
- `.env.example`

Core tables:

- `profiles`
- `user_role_assignments`
- `protocols`
- `protocol_prerequisites`
- `bundle_protocols`
- `protocol_phases`
- `resource_assets`
- `stripe_product_mappings`
- `purchases`
- `protocol_entitlements`
- `protocol_progress`
- `assessment_logs`
- `practice_logs`
- `resource_download_events`
- `practitioner_profiles`
- `practitioner_client_relationships`
- `practitioner_notes`
- `license_organizations`
- `license_memberships`
- `license_protocol_access`
- `cohorts`
- `cohort_memberships`
- `cohort_protocol_runs`
- `admin_audit_log`
- `webhook_events`

Initial replacement points:

- Replace `data/mock.ts` with Supabase queries.
- Replace `lib/access.ts` with entitlement checks using row-level security.
- Move practitioner visibility to active practitioner entitlement and active assignment checks.
- Move resource downloads to server-side entitlement checks and signed URLs.
- Keep Stripe product mapping in `stripe_product_mappings` as the database source of truth.
- Store assessment and tracker submissions in Supabase tables.

## Future Authentication Notes

Recommended path:

- Supabase Auth for email/password and magic link.
- Middleware route protection for portal pages.
- Role stored in `profiles`.
- Protocol entitlement stored separately from role.

Access should check both:

```txt
user role + active protocol entitlement
```

A practitioner role alone should not grant practitioner-layer access or visibility into client data.

## Future Payment and Access Control Notes

Recommended path:

- Stripe Checkout or existing WordPress checkout integration.
- Webhook creates or updates `purchases`.
- Purchase grants `protocol_entitlements`.
- Portal reads active access records at login.

Required access modes:

- Individual purchase
- Practitioner-guided access
- Cohort reset
- Licensed organization implementation
- Aggregate completion reporting

## Product Direction Guardrails

This is not a generic coaching portal.

The experience should remain:

- psychologically informed
- clinical-adjacent
- dark, premium, and structured
- oriented around behavioral governance
- low-friction and low cognitive load
- serious about therapeutic integration and future licensing

Avoid:

- wellness cliches
- pastel coaching UI
- influencer course aesthetics
- gamified self-help language
- pressure-based productivity copy
