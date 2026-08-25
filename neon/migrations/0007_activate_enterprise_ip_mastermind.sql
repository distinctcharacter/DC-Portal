-- Distinct Character Protocol Portal
-- DEV patch: Enterprise IP Mastermind is active commercial incubation, not future expansion.

update public.protocols
set
  status = 'active',
  description = 'Commercial incubation layer for converting self-mastery into intellectual property.',
  updated_at = now()
where id = 'DC-P07-EIP';

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
values
  (
    'DC-P07-EIP-RS01',
    'Enterprise IP Mastermind Resource Suite',
    'commercial_incubation_resource',
    'DC-P07-EIP',
    '/resources/enterprise-ip-mastermind-resource-suite.pdf',
    'client_advisor',
    false,
    true,
    true
  ),
  (
    'DC-P07-EIP-ADV01',
    'Enterprise IP Mastermind Advisor Legal-Ops Guide',
    'advisor_guide',
    'DC-P07-EIP',
    '/resources/enterprise-ip-mastermind-advisor-guide.pdf',
    'advisor_admin',
    true,
    true,
    true
  )
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

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
    'prod_REPLACE_EIP',
    'price_REPLACE_EIP',
    'enterprise_ip_mastermind',
    'Enterprise IP Mastermind',
    'one_time',
    'protocol',
    'DC-P07-EIP',
    'dtc_client',
    false,
    '{"delivery_layer":"commercial_incubation","price_band":"12000_15000"}'::jsonb,
    'Map to existing Enterprise IP Mastermind commercial incubation product.',
    false
  )
on conflict (stripe_product_id, stripe_price_id) do update set
  internal_product_key = excluded.internal_product_key,
  product_display_name = excluded.product_display_name,
  purchase_mode = excluded.purchase_mode,
  entitlement_type = excluded.entitlement_type,
  protocol_id = excluded.protocol_id,
  role_granted = excluded.role_granted,
  grant_child_protocols = excluded.grant_child_protocols,
  mapping_metadata = excluded.mapping_metadata,
  notes = excluded.notes,
  active = excluded.active;
