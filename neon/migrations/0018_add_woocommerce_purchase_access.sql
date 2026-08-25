-- Distinct Character Protocol Portal
-- Adds WooCommerce purchase-to-access support.

alter type public.purchase_source add value if not exists 'woocommerce_checkout';

create table if not exists public.woocommerce_product_mappings (
  id uuid primary key default gen_random_uuid(),
  woocommerce_product_id text not null,
  woocommerce_variation_id text,
  woocommerce_sku text,
  internal_product_key text not null,
  product_display_name text,
  entitlement_type public.entitlement_type not null,
  protocol_id text references public.protocols(id),
  role_granted public.user_role,
  access_duration_days integer,
  grant_child_protocols boolean not null default false,
  mapping_metadata jsonb not null default '{}'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchases
  add column if not exists woocommerce_order_id text,
  add column if not exists woocommerce_order_key text,
  add column if not exists woocommerce_product_id text,
  add column if not exists woocommerce_variation_id text,
  add column if not exists woocommerce_line_item_id text;

create unique index if not exists woocommerce_product_mappings_product_variation_unique_idx
on public.woocommerce_product_mappings (
  woocommerce_product_id,
  coalesce(woocommerce_variation_id, '')
);

create unique index if not exists woocommerce_product_mappings_sku_unique_idx
on public.woocommerce_product_mappings (woocommerce_sku)
where woocommerce_sku is not null;

create unique index if not exists purchases_woocommerce_order_line_unique_idx
on public.purchases (woocommerce_order_id, woocommerce_line_item_id)
where woocommerce_order_id is not null and woocommerce_line_item_id is not null;

create index if not exists purchases_woocommerce_order_idx
on public.purchases (woocommerce_order_id)
where woocommerce_order_id is not null;

insert into public.admin_audit_log (
  admin_user_id,
  action,
  target_table,
  metadata
)
values (
  null,
  'woocommerce_purchase_access_schema_added',
  'woocommerce_product_mappings',
  jsonb_build_object(
    'migration', '0018_add_woocommerce_purchase_access',
    'requires_mapping_rows', true
  )
);
