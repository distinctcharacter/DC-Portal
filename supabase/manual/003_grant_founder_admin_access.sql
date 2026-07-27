-- Distinct Character Portal
-- Founder admin access helper
--
-- Use this only if the Orders link does not appear after the founder orders dashboard files are published.
-- It grants admin access to the founder portal account below.

do $$
declare
  founder_email text := 'stephanie@granitefieldholdings.com';
  founder_user_id uuid;
begin
  select id
  into founder_user_id
  from public.profiles
  where email_normalized = lower(trim(founder_email))
  limit 1;

  if founder_user_id is null then
    raise exception 'No portal profile found for %. Sign in to the portal once with this email, then run this again.', founder_email;
  end if;

  update public.profiles
  set primary_role = 'admin',
      updated_at = now()
  where id = founder_user_id;

  insert into public.user_role_assignments (
    user_id,
    role,
    granted_reason
  )
  values (
    founder_user_id,
    'admin',
    'Founder orders dashboard access'
  )
  on conflict (user_id, role) do nothing;
end $$;
