grant usage on schema public to anon, authenticated;

grant select on table public.protocols to authenticated;
grant select on table public.protocol_phases to authenticated;
grant select on table public.protocol_prerequisites to authenticated;
grant select on table public.bundle_protocols to authenticated;
grant select on table public.protocol_entitlements to authenticated;
grant select on table public.resource_assets to authenticated;

grant select, insert, update on table public.protocol_progress to authenticated;
grant select, insert on table public.resource_download_events to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_role(public.user_role) to authenticated;
grant execute on function public.has_active_entitlement(uuid, public.entitlement_type, text) to authenticated;
grant execute on function public.has_any_active_entitlement(uuid) to authenticated;
grant execute on function public.can_access_protocol(text) to authenticated;
grant execute on function public.can_access_practitioner_layer() to authenticated;
grant execute on function public.can_access_license_layer() to authenticated;
