-- Distinct Character Protocol Portal
-- DEV-safe profile sync grants
-- Allows authenticated users to use the profiles table only within RLS policy limits.

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;

