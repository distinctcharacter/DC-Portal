-- Distinct Character Protocol Portal
-- Adds the Self-Mastery Blueprint Relapse & Re-Entry Ledger resource.

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable,
  active
)
values (
  'DC-P06-SMB-RR01',
  'Relapse & Re-Entry Ledger',
  'capstone_integration_tool',
  'DC-P06-SMB',
  '/resources/self-mastery-blueprint-relapse-reentry-ledger.pdf',
  'client_practitioner',
  false,
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
  active = excluded.active,
  updated_at = now();
