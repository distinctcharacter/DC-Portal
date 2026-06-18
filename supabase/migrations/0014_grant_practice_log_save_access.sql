-- Distinct Character Protocol Portal
-- Allow server functions to save protocol practice logs and progress updates.

grant select, insert, update on table public.practice_logs to service_role;
grant select, insert, update on table public.protocol_progress to service_role;

grant select, insert on table public.practice_logs to authenticated;
