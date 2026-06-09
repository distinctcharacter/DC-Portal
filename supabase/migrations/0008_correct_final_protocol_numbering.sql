-- Distinct Character Protocol Portal
-- DEV correction: final protocol numbering after ecosystem lock.
--
-- Corrects:
--   DC-P06-SOV -> DC-P05-SOV
--   DC-P07-SMB -> DC-P06-SMB
--   DC-P08-EIP -> DC-P07-EIP
--   DC-P09-AAS -> DC-M01-AAS

update public.protocols
set
  slug = 'legacy-sovereignty-reset',
  status = 'retired',
  updated_at = now()
where id = 'DC-P06-SOV';

update public.protocols
set
  slug = 'legacy-self-mastery-blueprint',
  status = 'retired',
  updated_at = now()
where id = 'DC-P07-SMB';

update public.protocols
set
  slug = 'legacy-enterprise-ip-mastermind',
  status = 'retired',
  updated_at = now()
where id = 'DC-P08-EIP';

update public.protocols
set
  slug = 'legacy-advanced-application-series',
  status = 'retired',
  updated_at = now()
where id = 'DC-P09-AAS';

insert into public.protocols (id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description)
values
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

delete from public.protocol_prerequisites
where (protocol_id, required_protocol_id) in (
  ('DC-P05-SOV', 'DC-P04-REL'),
  ('DC-P06-SMB', 'DC-P05-SOV')
);

update public.protocol_prerequisites set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.protocol_prerequisites set required_protocol_id = 'DC-P05-SOV' where required_protocol_id = 'DC-P06-SOV';
update public.protocol_prerequisites set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.protocol_prerequisites set required_protocol_id = 'DC-P06-SMB' where required_protocol_id = 'DC-P07-SMB';
update public.protocol_prerequisites set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.protocol_prerequisites set required_protocol_id = 'DC-P07-EIP' where required_protocol_id = 'DC-P08-EIP';
update public.protocol_prerequisites set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';
update public.protocol_prerequisites set required_protocol_id = 'DC-M01-AAS' where required_protocol_id = 'DC-P09-AAS';

insert into public.protocol_prerequisites (protocol_id, required_protocol_id, required_completion_percent)
values
  ('DC-P05-SOV', 'DC-P04-REL', 100),
  ('DC-P06-SMB', 'DC-P05-SOV', 100)
on conflict (protocol_id, required_protocol_id) do update set
  required_completion_percent = excluded.required_completion_percent;

update public.bundle_protocols set bundle_protocol_id = 'DC-P05-SOV' where bundle_protocol_id = 'DC-P06-SOV';
update public.bundle_protocols set child_protocol_id = 'DC-P05-SOV' where child_protocol_id = 'DC-P06-SOV';
update public.bundle_protocols set bundle_protocol_id = 'DC-P06-SMB' where bundle_protocol_id = 'DC-P07-SMB';
update public.bundle_protocols set child_protocol_id = 'DC-P06-SMB' where child_protocol_id = 'DC-P07-SMB';
update public.bundle_protocols set bundle_protocol_id = 'DC-P07-EIP' where bundle_protocol_id = 'DC-P08-EIP';
update public.bundle_protocols set child_protocol_id = 'DC-P07-EIP' where child_protocol_id = 'DC-P08-EIP';
update public.bundle_protocols set bundle_protocol_id = 'DC-M01-AAS' where bundle_protocol_id = 'DC-P09-AAS';
update public.bundle_protocols set child_protocol_id = 'DC-M01-AAS' where child_protocol_id = 'DC-P09-AAS';

update public.protocol_phases set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.protocol_phases set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.protocol_phases set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.protocol_phases set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';

update public.resource_assets set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.resource_assets set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.resource_assets set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.resource_assets set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
select
  'DC-P07-EIP-RS01',
  title,
  asset_type,
  'DC-P07-EIP',
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
from public.resource_assets
where id = 'DC-P08-EIP-RS01'
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  storage_path = excluded.storage_path,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
select
  'DC-P07-EIP-ADV01',
  title,
  asset_type,
  'DC-P07-EIP',
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
from public.resource_assets
where id = 'DC-P08-EIP-ADV01'
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  storage_path = excluded.storage_path,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

update public.resource_download_events set resource_asset_id = 'DC-P07-EIP-RS01' where resource_asset_id = 'DC-P08-EIP-RS01';
update public.resource_download_events set resource_asset_id = 'DC-P07-EIP-ADV01' where resource_asset_id = 'DC-P08-EIP-ADV01';

delete from public.resource_assets where id in ('DC-P08-EIP-RS01', 'DC-P08-EIP-ADV01');

update public.stripe_product_mappings
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.protocol_entitlements
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.protocol_progress
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.assessment_logs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practice_logs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.resource_download_events
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practitioner_client_relationships
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practitioner_notes
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.license_protocol_access
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.cohorts
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.cohort_protocol_runs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

delete from public.protocols
where id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');
