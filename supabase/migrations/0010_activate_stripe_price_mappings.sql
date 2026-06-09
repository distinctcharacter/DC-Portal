-- Distinct Character Protocol Portal
-- DEV Stripe mapping update: add real price IDs and activate current product mappings.
--
-- This activates mapping records only. Live Stripe webhooks still require server-side
-- implementation, secret keys, and webhook signing verification before production use.

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesfBwqPBseoKQ',
  stripe_price_id = 'price_1TfYuJAjPDAuKfvkb1CJSo0V',
  product_display_name = 'Somatic Baseline Protocol',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P01-SBP',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/8x2bJ0a5GdpHgPd4Ee08g0e'
  ),
  notes = 'Active Stripe mapping for Somatic Baseline Protocol.',
  active = true
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesBDIrW1NwlBx',
  stripe_price_id = 'price_1TfYQoAjPDAuKfvkewHqADfT',
  product_display_name = 'Cognitive Architecture Bundle',
  entitlement_type = 'bundle',
  protocol_id = 'DC-P02-COG',
  grant_child_protocols = true,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/bJe28qgu4bhzeH5b2C08g0f',
    'children',
    jsonb_build_array('DC-P02-IOS', 'DC-P02-MES', 'DC-P02-NCS')
  ),
  notes = 'Active Stripe mapping for Cognitive Architecture Bundle.',
  active = true
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UOYnAX7M7oK8Pc',
  stripe_price_id = 'price_1TPlfTAjPDAuKfvkwfliFljA',
  product_display_name = 'Execution Architecture Protocol',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P03-EXE',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/3cIaEW1za5Xf1UjeeO08g0a'
  ),
  notes = 'Active Stripe mapping for Execution Architecture Protocol.',
  active = true
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesU5fm4d0iOLU',
  stripe_price_id = 'price_1TfYjPAjPDAuKfvkkxZVNU66',
  product_display_name = 'Relational Command Bundle',
  entitlement_type = 'bundle',
  protocol_id = 'DC-P04-REL',
  grant_child_protocols = true,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/4gMeVc3Hi0CV0QffiS08g0g',
    'children',
    jsonb_build_array('DC-P04-AUT', 'DC-P04-ISC')
  ),
  notes = 'Active Stripe mapping for Relational Command Bundle.',
  active = true
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_U6LEDJkTFxXDVT',
  stripe_price_id = 'price_1T88XeAjPDAuKfvkaJiHOAmm',
  product_display_name = '30-Day Sovereignty Reset',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P05-SOV',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/cNi8wOgu45XfeH58Uu08g0h',
    'supports_cohorts',
    true
  ),
  notes = 'Active Stripe mapping for 30-Day Sovereignty Reset.',
  active = true
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UestZO2AWeKqDB',
  stripe_price_id = 'price_1TfZ7JAjPDAuKfvkOj8lh3pN',
  product_display_name = 'Self-Mastery Blueprint',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P06-SMB',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/6oUbJ00v62L3gPd4Ee08g0i'
  ),
  notes = 'Active Stripe mapping for Self-Mastery Blueprint.',
  active = true
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_Uet0jBSdTn7D1M',
  stripe_price_id = 'price_1TfZE2AjPDAuKfvk6WKQUwpn',
  product_display_name = 'The Enterprise IP Mastermind',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P07-EIP',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/5kQeVc6TudpHaqP6Mm08g0j',
    'delivery_layer',
    'commercial_incubation',
    'price_band',
    '12000_15000'
  ),
  notes = 'Active Stripe mapping for Enterprise IP Mastermind commercial incubation.',
  active = true
where internal_product_key = 'enterprise_ip_mastermind';

