-- Distinct Character Protocol Portal
-- Allow server functions to load practitioner workspace data and save practitioner notes.

grant select on table public.practitioner_profiles to service_role;
grant select on table public.practitioner_client_relationships to service_role;
grant select, insert, update on table public.practitioner_notes to service_role;
grant select on table public.license_memberships to service_role;
grant select on table public.license_organizations to service_role;
