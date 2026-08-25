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

## Remaining Validation

These are workflow confirmations, not migration construction:

1. Open one protected PDF while signed in and confirm it loads.
2. Save one practice-log entry and confirm the saved message appears.
3. Confirm the completion panel loads without marking the paid test protocol complete.
4. Confirm the Practitioner page stays locked for a normal client account.
5. When the first unrelated customer purchases, confirm the order appears in Founder Orders and the purchased product opens.

## Retirement Boundary

The Supabase project and old Netlify Supabase variables may be removed only after the protected download, practice-log, and completion-panel checks above pass. The repository's `supabase/` folder is historical reference only and is not used by production.

