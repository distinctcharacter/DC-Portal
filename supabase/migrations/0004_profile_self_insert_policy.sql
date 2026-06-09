-- Distinct Character Protocol Portal
-- DEV-safe profile sync policy
-- Allows an authenticated user to create only their own profile row.

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  id = auth.uid()
  and email_normalized = lower(trim(auth.jwt() ->> 'email'))
);

