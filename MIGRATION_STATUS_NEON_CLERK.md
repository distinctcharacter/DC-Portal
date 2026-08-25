# Neon And Clerk Transition Status

Updated: August 25, 2026

## Current Production System

- Authentication: Clerk
- Database: Neon Postgres
- Hosting and backend functions: Netlify
- Primary checkout: WooCommerce
- Optional direct-link checkout: Stripe

## Completed And Proven

- Clerk account creation and sign-in are live.
- Neon schema and WooCommerce product mappings are installed.
- Netlify has the Clerk, Neon, and WooCommerce environment variables.
- The Neon/Clerk healthcheck reaches the database.
- WooCommerce webhook signature verification is active.
- A WooCommerce order was recorded in Neon with its billing email and product ID.
- The purchase was claimed by the matching Clerk account.
- Product 684 mapped to the Cognitive Architecture Bundle.
- The bundle granted only its four intended protocol IDs.
- The Cognitive Architecture protocol page opens for the entitled account.
- All protocol detail URLs return successful HTTP responses.
- Founder Orders and System Audit pages are protected by founder/admin authorization.
- Supabase runtime packages and active imports have been removed.
- Purchase-linked access expiration is calculated from the purchase date, not the later account-claim date.
- The Clerk middleware restricts accepted production origins to the portal domain.
- A production Clerk account reconnects to the existing Neon profile by verified email, preserving purchases, roles, entitlements, progress, and founder records when Clerk user IDs change.
- A direct Neon audit confirmed all eight WooCommerce mappings are active, all bundle children exist, and there are no duplicate mappings or orphaned purchase/access records.
- Founder System Audit treats a failed WooCommerce delivery as resolved when a later delivery for the same order processes successfully.
- The production Clerk Frontend API domain is pre-authorized by the portal content security policy.
- Clerk Production is active on `portal.distinctcharacter.com` with verified DNS, issued SSL certificates, and live API keys.
- The founder production account reconnected to the original Neon profile and retained its purchase and protocol access.
- A protected Cognitive Architecture PDF opened successfully through the production authentication flow.
- Founder System Audit reports matching purchase data and active protocol access.
- The retired Netlify Supabase variables have been deleted and the old Supabase healthcheck returns `404`.

## Production Validation

The Supabase-to-Neon and development-to-production Clerk transition is complete. The portal healthcheck reaches Neon, production sign-in works, the existing WooCommerce purchase is claimed, the purchased bundle opens, and protected downloads remain authenticated.

The following are ordinary product-specific confirmations rather than transition blockers:

1. Save a practice-log entry when an account with Somatic Baseline access is available.
2. When the first unrelated customer purchases, confirm the order appears in Founder Orders and the purchased product opens.
3. Confirm any approved practitioner account receives its separate role, entitlement, and active practitioner profile before practitioner tools are used.

## Retirement Boundary

Supabase is no longer used by production. Its Netlify variables are deleted, its function endpoint is retired, and its project may be deleted after any desired archival export. The repository's `supabase/` folder remains historical reference only and must not be run against Neon.

