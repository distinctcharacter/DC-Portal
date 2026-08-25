# Neon + Clerk Launch Checklist

This checklist replaces the Supabase setup. Use it only after the Neon and Clerk accounts are created.

## SQL Files To Run In Neon

Run these in this exact order:

1. `neon/migrations/0001_distinct_character_neon_schema.sql`
2. `neon/migrations/0002_seed_protocol_catalog_and_mapping_placeholders.sql`
3. `neon/migrations/0007_activate_enterprise_ip_mastermind.sql`
4. `neon/migrations/0008_correct_final_protocol_numbering.sql`
5. `neon/migrations/0009_store_stripe_product_ids_and_payment_links.sql`
6. `neon/migrations/0010_activate_stripe_price_mappings.sql`
7. `neon/migrations/0016_set_portal_access_duration_timelines.sql`
8. `neon/migrations/0017_add_self_mastery_relapse_reentry_ledger.sql`
9. `neon/migrations/0018_add_woocommerce_purchase_access.sql`
10. `neon/manual/006_map_woocommerce_products_to_portal_access.sql`

Do not run the old `supabase/` SQL files for the Neon version.

Before running `neon/manual/006_map_woocommerce_products_to_portal_access.sql`, replace every `wc_REPLACE_...` value with the real WooCommerce product ID from the WordPress product. Leave `woocommerce_variation_id` as `null` unless a product uses WooCommerce variations.

## Netlify Environment Variables

Add these to Netlify for the portal project.

`DATABASE_URL`

- Value: the Neon database connection string.
- Secret: yes.
- Scopes: Functions and Builds.
- Deploy contexts: same value for Production, Deploy Previews, and Branch deploys unless a separate test database is created.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

- Value: the Clerk publishable key.
- Secret: no.
- Scopes: all scopes.
- Deploy contexts: same value for all deploy contexts.

`CLERK_SECRET_KEY`

- Value: the Clerk secret key.
- Secret: yes.
- Scopes: Functions and Builds.
- Deploy contexts: same value for Production, Deploy Previews, and Branch deploys unless a separate test Clerk app is created.

Keep these existing variables if the portal still uses them:

- `WOOCOMMERCE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FOUNDER_ADMIN_EMAILS`

Remove these only after the Neon/Clerk version is fully tested:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Clerk Redirect URLs

In Clerk, add the live portal URLs:

- `https://portal.distinctcharacter.com`
- `https://portal.distinctcharacter.com/auth/callback`
- `https://portal.distinctcharacter.com/access/claim`

Keep the Netlify URL only during testing if needed.

## First Test After Deployment

1. Deploy the updated portal from GitHub to Netlify.
2. Open `https://portal.distinctcharacter.com/.netlify/functions/neon-clerk-healthcheck`.
3. Confirm it returns `"ok": true`.
4. Open the portal login page.
5. Create or sign into a Clerk account using the same email used for a test WooCommerce order.
6. Confirm the purchase claim unlocks only the purchased product.
7. Confirm protected downloads still require access.
8. Confirm the founder orders dashboard loads only for the founder account.

## Rollback Note

Do not delete the Supabase project until the Neon/Clerk purchase flow has passed. If deployment fails, revert the Netlify deploy to the last published Supabase-backed deploy while the Neon issue is corrected.
