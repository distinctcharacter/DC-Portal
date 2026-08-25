-- Distinct Character Protocol Portal
-- WooCommerce product-to-portal access mapping template.
--
-- Current live WooCommerce product IDs have been added.
-- If a product later uses a variation, set woocommerce_variation_id to that variation ID.
-- Run this after neon/migrations/0018_add_woocommerce_purchase_access.sql.

delete from public.woocommerce_product_mappings
where internal_product_key in (
  'protocol_somatic_baseline',
  'bundle_cognitive_architecture',
  'protocol_execution_architecture',
  'bundle_relational_command',
  'protocol_30_day_sovereignty_reset',
  'protocol_self_mastery_blueprint',
  'mastermind_enterprise_ip',
  'practitioner_layer_access'
);

insert into public.woocommerce_product_mappings (
  woocommerce_product_id,
  woocommerce_variation_id,
  woocommerce_sku,
  internal_product_key,
  product_display_name,
  entitlement_type,
  protocol_id,
  role_granted,
  access_duration_days,
  grant_child_protocols,
  mapping_metadata,
  active
)
values
  (
    '683',
    null,
    null,
    'protocol_somatic_baseline',
    'Somatic Baseline Protocol',
    'protocol',
    'DC-P01-SBP',
    'dtc_client',
    45,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '684',
    null,
    null,
    'bundle_cognitive_architecture',
    'Cognitive Architecture Bundle',
    'bundle',
    'DC-P02-COG',
    'dtc_client',
    90,
    true,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '685',
    null,
    null,
    'protocol_execution_architecture',
    'Execution Architecture Protocol',
    'protocol',
    'DC-P03-EXE',
    'dtc_client',
    60,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '686',
    null,
    null,
    'bundle_relational_command',
    'Relational Command Bundle',
    'bundle',
    'DC-P04-REL',
    'dtc_client',
    90,
    true,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '687',
    null,
    null,
    'protocol_30_day_sovereignty_reset',
    'Sovereignty Installation Protocol',
    'protocol',
    'DC-P05-SOV',
    'dtc_client',
    45,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '688',
    null,
    null,
    'protocol_self_mastery_blueprint',
    'Self-Mastery Blueprint',
    'protocol',
    'DC-P06-SMB',
    'dtc_client',
    120,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '691',
    null,
    null,
    'mastermind_enterprise_ip',
    'Enterprise IP Mastermind',
    'masterclass',
    'DC-P07-EIP',
    'dtc_client',
    180,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    '731',
    null,
    null,
    'practitioner_layer_access',
    'Practitioner Access',
    'practitioner_layer',
    null,
    'practitioner',
    null,
    false,
    jsonb_build_object('source', 'woocommerce', 'delivery_layer', 'practitioner'),
    true
  );

select
  internal_product_key,
  product_display_name,
  woocommerce_product_id,
  protocol_id,
  entitlement_type,
  grant_child_protocols,
  active
from public.woocommerce_product_mappings
order by internal_product_key;
