-- Distinct Character Protocol Portal
-- DEV Stripe mapping update: store real product IDs and payment links.
--
-- Price IDs are still pending. Keep mappings inactive until each price_... ID is added
-- and webhook validation is implemented.

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesfBwqPBseoKQ',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/8x2bJ0a5GdpHgPd4Ee08g0e'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesBDIrW1NwlBx',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/bJe28qgu4bhzeH5b2C08g0f'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UOYnAX7M7oK8Pc',
  product_display_name = 'Execution Architecture Protocol',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/3cIaEW1za5Xf1UjeeO08g0a'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesU5fm4d0iOLU',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/4gMeVc3Hi0CV0QffiS08g0g'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_U6LEDJkTFxXDVT',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/cNi8wOgu45XfeH58Uu08g0h'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UestZO2AWeKqDB',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/6oUbJ00v62L3gPd4Ee08g0i'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_Uet0jBSdTn7D1M',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/5kQeVc6TudpHaqP6Mm08g0j'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'enterprise_ip_mastermind';

