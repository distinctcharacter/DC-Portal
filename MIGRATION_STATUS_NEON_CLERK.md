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

## Remaining Validation

The live portal is currently using Clerk development keys (`pk_test_` / `sk_test_`). Before public customer acquisition, activate the Clerk production instance for `portal.distinctcharacter.com`, replace both Clerk keys in Netlify with `pk_live_` / `sk_live_` values, and redeploy.

After that key change, these are workflow confirmations rather than migration construction:

1. Open one protected PDF while signed in and confirm it loads.
2. Save one practice-log entry and confirm the saved message appears.
3. Confirm the completion panel loads without marking the paid test protocol complete.
4. Confirm the Practitioner page stays locked for a normal client account.
5. When the first unrelated customer purchases, confirm the order appears in Founder Orders and the purchased product opens.

## Retirement Boundary

The Supabase project and old Netlify Supabase variables may be removed only after the protected download, practice-log, and completion-panel checks above pass. The repository's `supabase/` folder is historical reference only and is not used by production.

