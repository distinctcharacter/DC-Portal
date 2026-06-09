-- Distinct Character Protocol Portal
-- DEV-safe profile email reconciliation policy
-- Allows a logged-in user to reconcile an existing DEV profile row for the same normalized email.

drop policy if exists "profiles_select_same_email" on public.profiles;
drop policy if exists "profiles_update_same_email" on public.profiles;

create policy "profiles_select_same_email"
on public.profiles for select
to authenticated
using (
  email_normalized = lower(trim(auth.jwt() ->> 'email'))
);

create policy "profiles_update_same_email"
on public.profiles for update
to authenticated
using (
  email_normalized = lower(trim(auth.jwt() ->> 'email'))
)
with check (
  id = auth.uid()
  and email_normalized = lower(trim(auth.jwt() ->> 'email'))
);

