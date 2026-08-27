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
  'DC-P01-SBP-TA01',
  'Somatic Baseline Practitioner Therapeutic Addendum',
  'therapeutic_addendum',
  'DC-P01-SBP',
  '/resources/somatic-baseline-practitioner-therapeutic-addendum.pdf',
  'practitioner',
  true,
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

select id, title, public_path, practitioner_only, active
from public.resource_assets
where id = 'DC-P01-SBP-TA01';

