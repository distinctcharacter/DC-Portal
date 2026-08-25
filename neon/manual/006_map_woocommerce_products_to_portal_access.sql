-- Distinct Character Protocol Portal
-- WooCommerce product-to-portal access mapping template.
--
-- Replace each wc_REPLACE_* value with the WooCommerce product ID from your WordPress/WooCommerce product.
-- If a product has no variation, leave woocommerce_variation_id as null.
-- Run this after neon/migrations/0018_add_woocommerce_purchase_access.sql.

delete from public.woocommerce_product_mappings
where internal_product_key in (
  'protocol_somatic_baseline',
  'bundle_cognitive_architecture',
  'protocol_execution_architecture',
  'bundle_relational_command',
  'protocol_30_day_sovereignty_reset',
  'protocol_self_mastery_blueprint',
  'mastermind_enterprise_ip'
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
    'wc_REPLACE_SOMATIC_BASELINE_PRODUCT_ID',
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
    'wc_REPLACE_COGNITIVE_ARCHITECTURE_PRODUCT_ID',
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
    'wc_REPLACE_EXECUTION_ARCHITECTURE_PRODUCT_ID',
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
    'wc_REPLACE_RELATIONAL_COMMAND_PRODUCT_ID',
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
    'wc_REPLACE_30_DAY_SOVEREIGNTY_RESET_PRODUCT_ID',
    null,
    null,
    'protocol_30_day_sovereignty_reset',
    '30-Day Sovereignty Reset',
    'protocol',
    'DC-P05-SOV',
    'dtc_client',
    45,
    false,
    jsonb_build_object('source', 'woocommerce'),
    true
  ),
  (
    'wc_REPLACE_SELF_MASTERY_BLUEPRINT_PRODUCT_ID',
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
    'wc_REPLACE_ENTERPRISE_IP_MASTERMIND_PRODUCT_ID',
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
