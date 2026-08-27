# Neon And Clerk Transition Status

Updated: August 27, 2026

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
- Both retired Supabase projects have been deleted.
- A final production audit confirmed zero orphaned purchases, orphaned entitlements, missing protocols, duplicate webhook events, duplicate WooCommerce mappings, expired-active entitlements, claim mismatches, or unmapped WooCommerce purchases.
- Protocol detail content now requires server-side Clerk authentication, verified email, terms acceptance, and protocol-specific entitlement before the server sends it.
- Netlify function tokens now enforce the production portal as the authorized Clerk origin and require a verified primary email before email-based purchase claims.
- Terms acceptance is recorded through an authenticated server function in protected Clerk public metadata.
- Repeat purchases renew the matching entitlement without shortening an existing access window and reset completion state for the newly purchased product.
- The founder profile has an explicit Neon admin role so founder-facing practitioner and administrative backend checks agree with the interface.
- The temporary access diagnostic and retired practitioner compatibility helper have been removed.
- Production dependencies pass `npm audit` with zero known vulnerabilities, and the complete Next.js production build passes.
- Security headers are emitted by Next.js itself so the Netlify Next.js runtime cannot omit them from rendered portal pages.
- The approved 21-page Somatic Baseline Practitioner Therapeutic Addendum is installed only in the protected deployment resource directory and registered by idempotent Neon migration `0019_activate_somatic_baseline_practitioner_addendum.sql` as `DC-P01-SBP-TA01`.
- Somatic Baseline addendum access requires the Somatic Baseline protocol entitlement plus an active practitioner-layer entitlement, practitioner role, and active practitioner profile. A DTC client entitlement alone does not expose the catalog record or PDF.
- A direct production Neon query on August 27, 2026 confirmed `DC-P01-SBP-TA01` is active with the dedicated protected path, Somatic Baseline protocol binding, practitioner audience, and practitioner-only, downloadable, and printable flags set correctly.

## Production Validation

The Supabase-to-Neon and development-to-production Clerk transition is complete. The portal healthcheck reaches Neon, production sign-in works, the existing WooCommerce purchase is claimed, the purchased bundle opens, and protected downloads remain authenticated. Both Supabase projects are deleted and no active runtime code or package depends on Supabase.

The following are ordinary product-specific confirmations rather than transition blockers:

1. Save a practice-log entry when an account with Somatic Baseline access is available.
2. When the first unrelated customer purchases, confirm the order appears in Founder Orders and the purchased product opens.
3. After the protected-file and access-rule deployment is live, confirm an approved Somatic Baseline practitioner account can open `DC-P01-SBP-TA01` while a Somatic Baseline DTC client receives no catalog record and a direct download request is denied.

## Retirement Boundary

Supabase is no longer used by production. Its Netlify variables are deleted, its function endpoint is retired, and both projects have been deleted. The repository's `supabase/` folder remains historical reference only and must not be run against Neon.

## Protected Practitioner Content

- `DC-P01-SBP-TA01` now has a dedicated approved PDF at `protected-resources/resources/somatic-baseline-practitioner-therapeutic-addendum.pdf`.
- The PDF must not be copied to `public/resources`; `/resources/somatic-baseline-practitioner-therapeutic-addendum.pdf` is a logical catalog path that resolves through the authenticated Netlify protected-resource function.
- Migration `0019_activate_somatic_baseline_practitioner_addendum.sql` is active in production. The protected-file and access-rule deployment plus the two-account role-and-entitlement smoke test remain the final live publication checks.

