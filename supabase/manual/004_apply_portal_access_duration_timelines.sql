-- Manual Supabase SQL Editor version.
-- Run this in the Distinct Character Portal Supabase project.
-- It sets the official portal access duration timelines for each paid product.

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  access_duration_days = 90,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '90 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 90 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  access_duration_days = 90,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '90 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 90 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7,
    'completion_requirement', 'Complete one uninterrupted 30-day Sovereignty cycle within 60 calendar days.'
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  access_duration_days = 112,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '16 weeks',
    'curriculum_window', '14 weeks',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 16 weeks. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  access_duration_days = 98,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '14 weeks',
    'curriculum_window', '12 weeks',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 14 weeks. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'enterprise_ip_mastermind';

update public.protocol_entitlements pe
set
  expires_at = pe.starts_at + make_interval(days => spm.access_duration_days),
  updated_at = now()
from public.purchases pu
join public.stripe_product_mappings spm
  on (
    (pu.stripe_price_id is not null and pu.stripe_price_id = spm.stripe_price_id)
    or
    (pu.stripe_product_id is not null and pu.stripe_product_id = spm.stripe_product_id)
  )
where pe.purchase_id = pu.id
  and pe.expires_at is null
  and pe.status = 'active'
  and spm.access_duration_days is not null;

select
  internal_product_key,
  product_display_name,
  access_duration_days,
  mapping_metadata ->> 'portal_access_window' as portal_access_window,
  mapping_metadata ->> 'completion_closeout_days' as completion_closeout_days
from public.stripe_product_mappings
where internal_product_key in (
  'protocol_somatic_baseline',
  'bundle_cognitive_architecture',
  'protocol_execution_architecture',
  'bundle_relational_command',
  'protocol_sovereignty_reset',
  'protocol_self_mastery_blueprint',
  'enterprise_ip_mastermind'
)
order by access_duration_days, internal_product_key;
