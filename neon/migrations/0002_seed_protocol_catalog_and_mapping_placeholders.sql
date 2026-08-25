-- Distinct Character Protocol Portal
-- Protocol catalog and Stripe mapping placeholders
-- Replace placeholder Stripe IDs only after live credentials and product IDs are available.

insert into public.protocols (id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description)
values
  ('DC-P01-SBP', 'somatic-baseline', 'Somatic Baseline Protocol', 'Phase 1', 'active', 10, null, 'Biological foundation for behavioral governance and nervous system literacy.'),
  ('DC-P02-COG', 'cognitive-architecture', 'Cognitive Architecture', 'Phase 2', 'active', 20, null, 'Parent bundle for IOS-1, MES-1, and NCS-1.'),
  ('DC-P02-IOS', 'identity-operating-system', 'Identity Operating System', 'Phase 2A', 'active', 21, 'DC-P02-COG', 'Identity architecture protocol with handwritten processing requirements.'),
  ('DC-P02-MES', 'masking-economy-system', 'Masking Economy System', 'Phase 2B', 'active', 22, 'DC-P02-COG', 'Masking cost, protection, and resource allocation audit.'),
  ('DC-P02-NCS', 'narrative-control-system', 'Narrative Control System', 'Phase 2C', 'active', 23, 'DC-P02-COG', 'Interpretation governance and narrative calibration protocol.'),
  ('DC-P03-EXE', 'execution-architecture', 'Execution Architecture Protocol', 'Phase 3', 'active', 30, null, 'Governed execution system for capacity-aware action.'),
  ('DC-P04-REL', 'relational-command', 'Relational Command', 'Phase 4', 'active', 40, null, 'Parent bundle for Authority Framework and Internal Signal Calibration.'),
  ('DC-P04-AUT', 'authority-framework', 'Authority Framework', 'Phase 4A', 'active', 41, 'DC-P04-REL', 'Authority, soft power, and relational governance protocol.'),
  ('DC-P04-ISC', 'internal-signal-calibration', 'Internal Signal Calibration', 'Phase 4B', 'active', 42, 'DC-P04-REL', 'Internal signal fidelity and decision calibration protocol.'),
  ('DC-P05-SOV', 'sovereignty-reset', '30-Day Sovereignty Reset', 'Phase 5', 'active', 50, null, 'Timed reset container for daily governance enforcement.'),
  ('DC-P06-SMB', 'self-mastery-blueprint', 'Self-Mastery Blueprint', 'Phase 6 / Capstone', 'active', 60, null, 'Flagship capstone protocol for integrated self-mastery architecture.'),
  ('DC-P07-EIP', 'enterprise-ip-mastermind', 'Enterprise IP Mastermind', 'Tier 3', 'active', 70, null, 'Commercial incubation layer for converting self-mastery into intellectual property.'),
  ('DC-M01-AAS', 'advanced-application-series', 'Advanced Application Series', 'Expansion Layer', 'future', 90, null, 'Future masterclass and expansion layer.')
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  phase_label = excluded.phase_label,
  status = excluded.status,
  sequence_order = excluded.sequence_order,
  parent_protocol_id = excluded.parent_protocol_id,
  description = excluded.description,
  updated_at = now();

insert into public.protocol_prerequisites (protocol_id, required_protocol_id, required_completion_percent)
values
  ('DC-P02-COG', 'DC-P01-SBP', 100),
  ('DC-P03-EXE', 'DC-P02-IOS', 100),
  ('DC-P03-EXE', 'DC-P02-MES', 100),
  ('DC-P03-EXE', 'DC-P02-NCS', 100),
  ('DC-P04-REL', 'DC-P03-EXE', 100),
  ('DC-P05-SOV', 'DC-P04-REL', 100),
  ('DC-P06-SMB', 'DC-P05-SOV', 100)
on conflict (protocol_id, required_protocol_id) do update set
  required_completion_percent = excluded.required_completion_percent;

insert into public.bundle_protocols (bundle_protocol_id, child_protocol_id)
values
  ('DC-P02-COG', 'DC-P02-IOS'),
  ('DC-P02-COG', 'DC-P02-MES'),
  ('DC-P02-COG', 'DC-P02-NCS'),
  ('DC-P04-REL', 'DC-P04-AUT'),
  ('DC-P04-REL', 'DC-P04-ISC')
on conflict (bundle_protocol_id, child_protocol_id) do nothing;

insert into public.protocol_phases (protocol_id, phase_key, title, sequence_order, locked_by_default, requires_previous_phase)
values
  ('DC-P01-SBP', 'orientation', 'Orientation', 10, false, false),
  ('DC-P01-SBP', 'baseline-assessment', 'SDI Baseline Assessment', 20, true, true),
  ('DC-P01-SBP', 'biological-architecture', 'Biological Architecture', 30, true, true),
  ('DC-P01-SBP', 'vagus-nerve', 'The Vagus Nerve', 40, true, true),
  ('DC-P01-SBP', 'environmental-audit', 'Environmental Audit', 50, true, true),
  ('DC-P01-SBP', 'tactical-resets', 'Tactical Reset Protocols', 60, true, true)
on conflict (protocol_id, phase_key) do update set
  title = excluded.title,
  sequence_order = excluded.sequence_order,
  locked_by_default = excluded.locked_by_default,
  requires_previous_phase = excluded.requires_previous_phase;

insert into public.resource_assets (id, title, asset_type, protocol_id, public_path, audience, practitioner_only, downloadable, printable)
values
  ('DC-R01-BIC', 'Biological Infrastructure Companion', 'foundation_reference', null, '/resources/biological-infrastructure-companion.pdf', 'client_practitioner', false, true, true),
  ('DC-R02-12W', '12 Dimensions of Wellness', 'foundation_reference', null, '/resources/12-dimensions-wellness.pdf', 'client_practitioner', false, true, true),
  ('DC-R03-GLO', 'Distinct Character Framework Glossary', 'foundation_reference', null, '/resources/distinct-character-framework-glossary.pdf', 'client_practitioner', false, true, true),
  ('DC-R04-BSI', 'Body Signal Index', 'foundation_reference', null, '/resources/body-signal-index.pdf', 'client_practitioner', false, true, true),
  ('DC-R05-NSG', 'Nervous System Governance Guide', 'foundation_reference', null, '/resources/nervous-system-governance-guide.pdf', 'client_practitioner', false, true, true),
  ('DC-R06-NSG-ESMR', 'Nervous System Governance: Eating, Sleep, Movement, Recovery', 'foundation_reference', null, '/resources/nsg-digestion-sleep-movement-recovery.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-PC01', 'Somatic Baseline Printable Companion', 'protocol_pdf', 'DC-P01-SBP', '/resources/somatic-baseline-protocol.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-CM01', 'Somatic Baseline Companion Materials', 'companion_pdf', 'DC-P01-SBP', '/resources/somatic-baseline-companion.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-TA01', 'Somatic Baseline Therapeutic Addendum', 'therapeutic_addendum', 'DC-P01-SBP', '/resources/somatic-baseline-protocol.pdf', 'practitioner', true, true, true),
  ('DC-P07-EIP-RS01', 'Enterprise IP Mastermind Resource Suite', 'commercial_incubation_resource', 'DC-P07-EIP', '/resources/enterprise-ip-mastermind-resource-suite.pdf', 'client_advisor', false, true, true),
  ('DC-P07-EIP-ADV01', 'Enterprise IP Mastermind Advisor Legal-Ops Guide', 'advisor_guide', 'DC-P07-EIP', '/resources/enterprise-ip-mastermind-advisor-guide.pdf', 'advisor_admin', true, true, true)
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
  access_duration_days,
  grant_child_protocols,
  seat_limit,
  mapping_metadata,
  notes,
  active
)
values
  ('prod_REPLACE_SBP', 'price_REPLACE_SBP', 'protocol_somatic_baseline', 'Somatic Baseline Protocol', 'one_time', 'protocol', 'DC-P01-SBP', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Somatic Baseline Stripe payment link product.', false),
  ('prod_REPLACE_COG', 'price_REPLACE_COG', 'bundle_cognitive_architecture', 'Cognitive Architecture Bundle', 'one_time', 'bundle', 'DC-P02-COG', 'dtc_client', null, true, null, '{"delivery_layer":"bundle","children":["DC-P02-IOS","DC-P02-MES","DC-P02-NCS"]}'::jsonb, 'Map to existing Cognitive Architecture product or bundle.', false),
  ('prod_REPLACE_EXE', 'price_REPLACE_EXE', 'protocol_execution_architecture', 'Execution Architecture Protocol', 'one_time', 'protocol', 'DC-P03-EXE', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Execution Architecture product.', false),
  ('prod_REPLACE_REL', 'price_REPLACE_REL', 'bundle_relational_command', 'Relational Command Bundle', 'one_time', 'bundle', 'DC-P04-REL', 'dtc_client', null, true, null, '{"delivery_layer":"bundle","children":["DC-P04-AUT","DC-P04-ISC"]}'::jsonb, 'Map to existing Relational Command bundle product.', false),
  ('prod_REPLACE_SOV', 'price_REPLACE_SOV', 'protocol_sovereignty_reset', '30-Day Sovereignty Reset', 'one_time', 'protocol', 'DC-P05-SOV', 'dtc_client', null, false, null, '{"delivery_layer":"protocol","supports_cohorts":true}'::jsonb, 'Map to existing 30-Day Sovereignty Reset product.', false),
  ('prod_REPLACE_SMB', 'price_REPLACE_SMB', 'protocol_self_mastery_blueprint', 'Self-Mastery Blueprint', 'one_time', 'protocol', 'DC-P06-SMB', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Self-Mastery Blueprint product.', false),
  ('prod_REPLACE_EIP', 'price_REPLACE_EIP', 'enterprise_ip_mastermind', 'Enterprise IP Mastermind', 'one_time', 'protocol', 'DC-P07-EIP', 'dtc_client', null, false, null, '{"delivery_layer":"commercial_incubation","price_band":"12000_15000"}'::jsonb, 'Map to existing Enterprise IP Mastermind commercial incubation product.', false),
  ('prod_REPLACE_PRACTITIONER', 'price_REPLACE_PRACTITIONER', 'practitioner_layer_access', 'Practitioner Layer Access', 'one_time', 'practitioner_layer', null, 'practitioner', null, false, null, '{"delivery_layer":"practitioner"}'::jsonb, 'Separate practitioner pricing and access rights.', false),
  ('prod_REPLACE_LICENSE', 'price_REPLACE_LICENSE', 'license_holder_access', 'License Holder Access', 'license', 'license_seat', null, 'license_holder', null, false, null, '{"delivery_layer":"license"}'::jsonb, 'Separate license holder pricing and organization access rights.', false),
  ('prod_REPLACE_MASTERCLASS', 'price_REPLACE_MASTERCLASS', 'masterclass_advanced_application_series', 'Advanced Application Series', 'one_time', 'masterclass', 'DC-M01-AAS', 'dtc_client', null, false, null, '{"delivery_layer":"masterclass"}'::jsonb, 'Future expansion layer product.', false)
on conflict (stripe_product_id, stripe_price_id) do update set
  internal_product_key = excluded.internal_product_key,
  product_display_name = excluded.product_display_name,
  purchase_mode = excluded.purchase_mode,
  entitlement_type = excluded.entitlement_type,
  protocol_id = excluded.protocol_id,
  role_granted = excluded.role_granted,
  access_duration_days = excluded.access_duration_days,
  grant_child_protocols = excluded.grant_child_protocols,
  seat_limit = excluded.seat_limit,
  mapping_metadata = excluded.mapping_metadata,
  notes = excluded.notes,
  active = excluded.active;
