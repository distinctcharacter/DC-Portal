# Distinct Character Protocol Portal

The production portal delivers purchased Distinct Character protocols, protected resources, progress tools, completion workflows, and approved practitioner access.

## Production Stack

- Next.js 16 on Netlify
- Clerk for customer authentication and account recovery
- Neon Postgres for purchases, mappings, entitlements, progress, logs, roles, and founder reporting
- WooCommerce as the primary checkout and purchase webhook source
- Stripe as an optional direct-link purchase source

## Purchase And Access Flow

1. WooCommerce sends a signed order webhook for a processing or completed order.
2. The portal records the purchase in Neon and maps the WooCommerce product to its protocol IDs.
3. The customer creates or signs into a Clerk account using the checkout email.
4. The portal claims matching purchases and grants only the purchased protocol entitlements.
5. Every protocol page and protected download rechecks server-side access.

Roles do not grant broad catalog access. Product-specific entitlements remain the source of truth.

## Required Netlify Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `WOOCOMMERCE_WEBHOOK_SECRET`
- `FOUNDER_ADMIN_EMAILS`

Optional Stripe direct-link support also uses `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

Never commit `.env.local` or live credentials. Use Netlify environment variables for production.

## Local Validation

```bash
npm install
npm run typecheck
npm run build
```

Local authenticated testing additionally requires Clerk and Neon development values in an ignored `.env.local` file.

## Important Paths

- `app/` - portal pages
- `components/` - customer and founder interfaces
- `netlify/functions/` - authenticated backend and payment webhooks
- `netlify/functions/_shared/` - Clerk, Neon, entitlement, and access helpers
- `neon/` - current schema, migrations, and product mappings
- `protected-resources/` - server-protected downloadable PDFs
- `docs/backend/neon-clerk-launch-checklist.md` - nontechnical environment checklist

## Legacy Supabase Archive

The `supabase/` directory is retained only as historical migration reference. It is not part of the running portal and its SQL must not be run against Neon. Active code must not import Supabase packages, clients, or environment variables.

