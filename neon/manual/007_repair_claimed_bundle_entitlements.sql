-- Distinct Character Portal
-- One-time repair for claimed purchases that are missing bundle or child protocol entitlements.
-- Safe behavior: inserts missing active access rows only. It does not delete or expire data.

with claimed_woocommerce_bundle_purchases as (
  select
    p.id as purchase_id,
    p.user_id,
    p.source,
    wpm.entitlement_type,
    wpm.protocol_id,
    wpm.access_duration_days
  from public.purchases p
  join public.woocommerce_product_mappings wpm
    on wpm.woocommerce_product_id = p.woocommerce_product_id
   and (
     wpm.woocommerce_variation_id is null
     or wpm.woocommerce_variation_id = p.woocommerce_variation_id
   )
  where p.user_id is not null
    and p.claimed_at is not null
    and wpm.active = true
    and wpm.entitlement_type = 'bundle'
    and wpm.protocol_id is not null
),
claimed_stripe_bundle_purchases as (
  select
    p.id as purchase_id,
    p.user_id,
    p.source,
    spm.entitlement_type,
    spm.protocol_id,
    spm.access_duration_days
  from public.purchases p
  join public.stripe_product_mappings spm
    on (
      (p.stripe_price_id is not null and spm.stripe_price_id = p.stripe_price_id)
      or (p.stripe_price_id is null and p.stripe_product_id is not null and spm.stripe_product_id = p.stripe_product_id)
    )
  where p.user_id is not null
    and p.claimed_at is not null
    and spm.active = true
    and spm.entitlement_type = 'bundle'
    and spm.protocol_id is not null
),
claimed_bundle_purchases as (
  select * from claimed_woocommerce_bundle_purchases
  union
  select * from claimed_stripe_bundle_purchases
),
insert_parent_bundle_entitlements as (
  insert into public.protocol_entitlements (
    user_id,
    entitlement_type,
    protocol_id,
    purchase_id,
    source,
    status,
    starts_at,
    expires_at
  )
  select
    cbp.user_id,
    cbp.entitlement_type::public.entitlement_type,
    cbp.protocol_id,
    cbp.purchase_id,
    cbp.source,
    'active',
    now(),
    case
      when cbp.access_duration_days is null then null
      else now() + (cbp.access_duration_days || ' days')::interval
    end
  from claimed_bundle_purchases cbp
  on conflict do nothing
  returning user_id, purchase_id, protocol_id
)
insert into public.protocol_entitlements (
  user_id,
  entitlement_type,
  protocol_id,
  purchase_id,
  source,
  status,
  starts_at,
  expires_at
)
select
  cbp.user_id,
  'protocol'::public.entitlement_type,
  bp.child_protocol_id,
  cbp.purchase_id,
  cbp.source,
  'active',
  now(),
  case
    when cbp.access_duration_days is null then null
    else now() + (cbp.access_duration_days || ' days')::interval
  end
from claimed_bundle_purchases cbp
join public.bundle_protocols bp
  on bp.bundle_protocol_id = cbp.protocol_id
on conflict do nothing;
