-- Distinct Character Protocol Portal
-- Development-only mock structure smoke test
-- Do not run in production.
-- This script rolls back its temporary fake rows.

begin;

insert into public.protocols (
  id,
  slug,
  title,
  phase_label,
  status,
  sequence_order,
  parent_protocol_id,
  description
)
values
  (
    'DC-DEV-BUNDLE',
    'dev-test-bundle',
    'Development Test Bundle',
    'Development',
    'draft',
    900,
    null,
    'Temporary bundle used only to verify database structure.'
  ),
  (
    'DC-DEV-CHILD',
    'dev-test-child-protocol',
    'Development Test Child Protocol',
    'Development',
    'draft',
    901,
    'DC-DEV-BUNDLE',
    'Temporary child protocol used only to verify bundle resolution structure.'
  );

insert into public.bundle_protocols (
  bundle_protocol_id,
  child_protocol_id
)
values
  ('DC-DEV-BUNDLE', 'DC-DEV-CHILD');

insert into public.protocol_phases (
  protocol_id,
  phase_key,
  title,
  sequence_order,
  locked_by_default,
  requires_previous_phase
)
values
  (
    'DC-DEV-CHILD',
    'dev-orientation',
    'Development Orientation',
    10,
    false,
    false
  );

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  storage_path,
  audience,
  practitioner_only,
  downloadable,
  printable,
  active
)
values
  (
    'DC-DEV-RESOURCE',
    'Development Test Resource',
    'development_test',
    'DC-DEV-CHILD',
    'dev/test-resource.pdf',
    'client_practitioner',
    false,
    true,
    true,
    true
  );

insert into public.stripe_product_mappings (
  stripe_product_id,
  stripe_price_id,
  internal_product_key,
  product_display_name,
  purchase_mode,
  entitlement_type,
  protocol_id,
  role_granted,
  grant_child_protocols,
  mapping_metadata,
  notes,
  active
)
values
  (
    'prod_DEV_STRUCTURE_TEST',
    'price_DEV_STRUCTURE_TEST',
    'dev_structure_test_bundle',
    'Development Structure Test Bundle',
    'one_time',
    'bundle',
    'DC-DEV-BUNDLE',
    'dtc_client',
    true,
    '{"development_only":true}'::jsonb,
    'Temporary mapping used only to verify database structure.',
    false
  );

select
  'protocol_catalog_rows' as check_name,
  count(*) as result_count
from public.protocols
where id like 'DC-P%';

select
  'bundle_child_rows' as check_name,
  count(*) as result_count
from public.bundle_protocols
where bundle_protocol_id in ('DC-P02-COG', 'DC-P04-REL', 'DC-DEV-BUNDLE');

select
  'resource_rows' as check_name,
  count(*) as result_count
from public.resource_assets;

select
  'stripe_mapping_rows_inactive_placeholders' as check_name,
  count(*) as result_count
from public.stripe_product_mappings
where active = false;

select
  'mock_structure_test_status' as check_name,
  'passed_inside_transaction_fake_rows_will_be_rolled_back' as status;

rollback;

