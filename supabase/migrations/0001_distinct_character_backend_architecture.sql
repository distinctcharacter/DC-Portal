-- Distinct Character Protocol Portal
-- Backend-ready Supabase architecture
-- Architecture only. Do not run against production until reviewed.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum (
    'dtc_client',
    'practitioner',
    'license_holder',
    'admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.access_status as enum (
    'active',
    'pending',
    'expired',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.protocol_status as enum (
    'active',
    'draft',
    'retired',
    'future'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.purchase_source as enum (
    'stripe_payment_link',
    'stripe_checkout',
    'wordpress_manual',
    'admin_grant',
    'license_seat'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.entitlement_type as enum (
    'protocol',
    'bundle',
    'practitioner_layer',
    'resource_library',
    'masterclass',
    'license_seat',
    'cohort',
    'certification'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  full_name text,
  primary_role public.user_role not null default 'dtc_client',
  onboarding_complete boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references public.profiles(id),
  granted_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.protocols (
  id text primary key,
  slug text not null unique,
  title text not null,
  phase_label text not null,
  status public.protocol_status not null default 'active',
  sequence_order integer not null,
  parent_protocol_id text references public.protocols(id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.protocol_prerequisites (
  id uuid primary key default gen_random_uuid(),
  protocol_id text not null references public.protocols(id) on delete cascade,
  required_protocol_id text not null references public.protocols(id) on delete cascade,
  required_completion_percent integer not null default 100 check (required_completion_percent between 0 and 100),
  created_at timestamptz not null default now(),
  unique (protocol_id, required_protocol_id)
);

create table if not exists public.bundle_protocols (
  id uuid primary key default gen_random_uuid(),
  bundle_protocol_id text not null references public.protocols(id) on delete cascade,
  child_protocol_id text not null references public.protocols(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (bundle_protocol_id, child_protocol_id)
);

create table if not exists public.protocol_phases (
  id uuid primary key default gen_random_uuid(),
  protocol_id text not null references public.protocols(id) on delete cascade,
  phase_key text not null,
  title text not null,
  sequence_order integer not null,
  locked_by_default boolean not null default true,
  requires_previous_phase boolean not null default true,
  created_at timestamptz not null default now(),
  unique (protocol_id, phase_key)
);

create table if not exists public.resource_assets (
  id text primary key,
  title text not null,
  asset_type text not null,
  protocol_id text references public.protocols(id),
  storage_path text,
  public_path text,
  audience text not null default 'client_practitioner',
  practitioner_only boolean not null default false,
  downloadable boolean not null default true,
  printable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_product_mappings (
  id uuid primary key default gen_random_uuid(),
  stripe_product_id text not null,
  stripe_price_id text,
  internal_product_key text not null,
  product_display_name text,
  price_display_name text,
  purchase_mode text not null default 'one_time',
  entitlement_type public.entitlement_type not null,
  protocol_id text references public.protocols(id),
  role_granted public.user_role,
  access_duration_days integer,
  grant_child_protocols boolean not null default false,
  seat_limit integer,
  mapping_metadata jsonb not null default '{}'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_purchase_mode check (purchase_mode in ('one_time', 'subscription', 'manual', 'license')),
  unique (stripe_product_id, stripe_price_id)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  source public.purchase_source not null,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_product_id text,
  stripe_price_id text,
  amount_total integer,
  currency text,
  purchased_at timestamptz not null default now(),
  claimed_at timestamptz,
  email_verified_before_claim boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.protocol_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entitlement_type public.entitlement_type not null default 'protocol',
  protocol_id text references public.protocols(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  source public.purchase_source not null default 'admin_grant',
  status public.access_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_target_required check (
    protocol_id is not null
    or entitlement_type in ('practitioner_layer', 'resource_library', 'masterclass', 'license_seat', 'cohort', 'certification')
  )
);

create unique index if not exists protocol_entitlements_unique_active_protocol
on public.protocol_entitlements (user_id, protocol_id, entitlement_type)
where status in ('active', 'pending') and protocol_id is not null;

create table if not exists public.protocol_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  phase_id uuid references public.protocol_phases(id) on delete set null,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  current_phase_key text,
  last_activity_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, protocol_id)
);

create table if not exists public.assessment_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  assessment_key text not null,
  phase_key text,
  score jsonb not null default '{}'::jsonb,
  notes text,
  submitted_at timestamptz not null default now()
);

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  practice_key text not null,
  state_before text,
  state_after text,
  context_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_asset_id text not null references public.resource_assets(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete set null,
  access_granted boolean not null,
  denial_reason text,
  signed_url_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.practitioner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  credential_summary text,
  access_status public.access_status not null default 'pending',
  purchased_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practitioner_client_relationships (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete set null,
  status public.access_status not null default 'active',
  client_consented_at timestamptz,
  practitioner_assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (practitioner_id, client_id, protocol_id)
);

create table if not exists public.practitioner_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete set null,
  note_type text not null,
  visibility text not null default 'practitioner_only',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practitioner_note_visibility check (visibility in ('practitioner_only', 'shared_with_client', 'admin_review'))
);

create table if not exists public.license_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license_holder_id uuid references public.profiles(id) on delete set null,
  stripe_customer_id text,
  status public.access_status not null default 'active',
  seat_limit integer not null default 1 check (seat_limit > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.license_organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'dtc_client',
  status public.access_status not null default 'active',
  invited_email text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.license_protocol_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.license_organizations(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete cascade,
  entitlement_type public.entitlement_type not null default 'protocol',
  status public.access_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, protocol_id, entitlement_type)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protocol_id text references public.protocols(id) on delete set null,
  organization_id uuid references public.license_organizations(id) on delete set null,
  facilitator_id uuid references public.profiles(id) on delete set null,
  status public.access_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'dtc_client',
  status public.access_status not null default 'active',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create table if not exists public.cohort_protocol_runs (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.access_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, protocol_id)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz,
  processing_status text not null default 'received',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint webhook_processing_status check (processing_status in ('received', 'processed', 'failed', 'ignored'))
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.has_role(check_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = auth.uid()
      and ura.role = check_role
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.primary_role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin'::public.user_role);
$$;

create or replace function public.has_active_entitlement(
  check_user_id uuid,
  check_type public.entitlement_type,
  check_protocol_id text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.protocol_entitlements pe
    where pe.user_id = check_user_id
      and pe.entitlement_type = check_type
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and (
        check_protocol_id is null
        or pe.protocol_id = check_protocol_id
      )
  );
$$;

create or replace function public.has_any_active_entitlement(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.protocol_entitlements pe
    where pe.user_id = check_user_id
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
  );
$$;

create or replace function public.can_access_protocol(check_protocol_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.protocol_entitlements pe
    where pe.user_id = auth.uid()
      and pe.protocol_id = check_protocol_id
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
  )
  or exists (
    select 1
    from public.protocol_entitlements pe
    join public.bundle_protocols bp on bp.bundle_protocol_id = pe.protocol_id
    where pe.user_id = auth.uid()
      and pe.entitlement_type = 'bundle'
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and bp.child_protocol_id = check_protocol_id
  )
  or exists (
    select 1
    from public.license_memberships lm
    join public.license_protocol_access lpa on lpa.organization_id = lm.organization_id
    join public.license_organizations lo on lo.id = lm.organization_id
    where lm.user_id = auth.uid()
      and lm.status = 'active'
      and lo.status = 'active'
      and (lo.expires_at is null or lo.expires_at > now())
      and lpa.protocol_id = check_protocol_id
      and lpa.status = 'active'
  );
$$;

create or replace function public.can_access_practitioner_layer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.protocol_entitlements pe
    join public.practitioner_profiles pp on pp.user_id = pe.user_id
    where pe.user_id = auth.uid()
      and pe.entitlement_type = 'practitioner_layer'
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and pp.access_status = 'active'
      and public.has_role('practitioner'::public.user_role)
  );
$$;

create or replace function public.can_access_license_layer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or (
    public.has_role('license_holder'::public.user_role)
    and (
      exists (
        select 1
        from public.protocol_entitlements pe
        where pe.user_id = auth.uid()
          and pe.entitlement_type = 'license_seat'
          and pe.status = 'active'
          and (pe.expires_at is null or pe.expires_at > now())
      )
      or exists (
        select 1
        from public.license_organizations lo
        join public.license_memberships lm on lm.organization_id = lo.id
        where lm.user_id = auth.uid()
          and lm.status = 'active'
          and lo.status = 'active'
          and (lo.expires_at is null or lo.expires_at > now())
      )
    )
  );
$$;

create or replace function public.can_claim_purchase(check_purchase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.purchases pu
    join public.profiles p on p.id = auth.uid()
    join auth.users au on au.id = auth.uid()
    where pu.id = check_purchase_id
      and pu.user_id is null
      and pu.claimed_at is null
      and pu.email_normalized = p.email_normalized
      and au.email_confirmed_at is not null
  );
$$;

create or replace function public.can_download_resource(check_resource_asset_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resource_assets ra
    where ra.id = check_resource_asset_id
      and ra.active = true
      and ra.downloadable = true
      and (
        public.is_admin()
        or (
          ra.practitioner_only = true
          and public.can_access_practitioner_layer()
          and (
            ra.protocol_id is null
            or public.can_access_protocol(ra.protocol_id)
          )
        )
        or (
          ra.practitioner_only = false
          and (
            (ra.protocol_id is not null and public.can_access_protocol(ra.protocol_id))
            or (ra.protocol_id is null and public.has_any_active_entitlement(auth.uid()))
          )
        )
      )
  );
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists protocols_touch_updated_at on public.protocols;
create trigger protocols_touch_updated_at
before update on public.protocols
for each row execute function public.touch_updated_at();

drop trigger if exists resource_assets_touch_updated_at on public.resource_assets;
create trigger resource_assets_touch_updated_at
before update on public.resource_assets
for each row execute function public.touch_updated_at();

drop trigger if exists stripe_product_mappings_touch_updated_at on public.stripe_product_mappings;
create trigger stripe_product_mappings_touch_updated_at
before update on public.stripe_product_mappings
for each row execute function public.touch_updated_at();

drop trigger if exists protocol_entitlements_touch_updated_at on public.protocol_entitlements;
create trigger protocol_entitlements_touch_updated_at
before update on public.protocol_entitlements
for each row execute function public.touch_updated_at();

drop trigger if exists protocol_progress_touch_updated_at on public.protocol_progress;
create trigger protocol_progress_touch_updated_at
before update on public.protocol_progress
for each row execute function public.touch_updated_at();

drop trigger if exists practitioner_notes_touch_updated_at on public.practitioner_notes;
create trigger practitioner_notes_touch_updated_at
before update on public.practitioner_notes
for each row execute function public.touch_updated_at();

drop trigger if exists license_organizations_touch_updated_at on public.license_organizations;
create trigger license_organizations_touch_updated_at
before update on public.license_organizations
for each row execute function public.touch_updated_at();

drop trigger if exists cohorts_touch_updated_at on public.cohorts;
create trigger cohorts_touch_updated_at
before update on public.cohorts
for each row execute function public.touch_updated_at();

drop trigger if exists cohort_protocol_runs_touch_updated_at on public.cohort_protocol_runs;
create trigger cohort_protocol_runs_touch_updated_at
before update on public.cohort_protocol_runs
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.protocols enable row level security;
alter table public.protocol_prerequisites enable row level security;
alter table public.bundle_protocols enable row level security;
alter table public.protocol_phases enable row level security;
alter table public.resource_assets enable row level security;
alter table public.stripe_product_mappings enable row level security;
alter table public.purchases enable row level security;
alter table public.protocol_entitlements enable row level security;
alter table public.protocol_progress enable row level security;
alter table public.assessment_logs enable row level security;
alter table public.practice_logs enable row level security;
alter table public.resource_download_events enable row level security;
alter table public.practitioner_profiles enable row level security;
alter table public.practitioner_client_relationships enable row level security;
alter table public.practitioner_notes enable row level security;
alter table public.license_organizations enable row level security;
alter table public.license_memberships enable row level security;
alter table public.license_protocol_access enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_memberships enable row level security;
alter table public.cohort_protocol_runs enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "protocols_select_authenticated" on public.protocols;
create policy "protocols_select_authenticated"
on public.protocols for select
to authenticated
using (true);

drop policy if exists "protocol_phases_select_authenticated" on public.protocol_phases;
create policy "protocol_phases_select_authenticated"
on public.protocol_phases for select
to authenticated
using (true);

drop policy if exists "bundle_protocols_select_authenticated" on public.bundle_protocols;
create policy "bundle_protocols_select_authenticated"
on public.bundle_protocols for select
to authenticated
using (true);

drop policy if exists "resource_assets_select_by_access" on public.resource_assets;
create policy "resource_assets_select_by_access"
on public.resource_assets for select
to authenticated
using (
  active = true
  and (
    public.is_admin()
    or (
      practitioner_only = true
      and public.can_access_practitioner_layer()
      and (
        protocol_id is null
        or public.can_access_protocol(protocol_id)
      )
    )
    or (
      practitioner_only = false
      and (
        (protocol_id is not null and public.can_access_protocol(protocol_id))
        or (protocol_id is null and public.has_any_active_entitlement(auth.uid()))
      )
    )
  )
);

drop policy if exists "entitlements_select_own_or_admin" on public.protocol_entitlements;
create policy "entitlements_select_own_or_admin"
on public.protocol_entitlements for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "progress_select_own_or_practitioner_or_admin" on public.protocol_progress;
create policy "progress_select_own_or_practitioner_or_admin"
on public.protocol_progress for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.can_access_practitioner_layer()
    and exists (
    select 1 from public.practitioner_client_relationships pcr
    where pcr.practitioner_id = auth.uid()
      and pcr.client_id = protocol_progress.user_id
      and pcr.status = 'active'
    )
  )
);

drop policy if exists "progress_upsert_own" on public.protocol_progress;
create policy "progress_upsert_own"
on public.protocol_progress for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "assessment_logs_select_own_or_practitioner_or_admin" on public.assessment_logs;
create policy "assessment_logs_select_own_or_practitioner_or_admin"
on public.assessment_logs for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.can_access_practitioner_layer()
    and exists (
    select 1 from public.practitioner_client_relationships pcr
    where pcr.practitioner_id = auth.uid()
      and pcr.client_id = assessment_logs.user_id
      and pcr.status = 'active'
    )
  )
);

drop policy if exists "assessment_logs_insert_own" on public.assessment_logs;
create policy "assessment_logs_insert_own"
on public.assessment_logs for insert
with check (user_id = auth.uid());

drop policy if exists "practice_logs_select_own_or_practitioner_or_admin" on public.practice_logs;
create policy "practice_logs_select_own_or_practitioner_or_admin"
on public.practice_logs for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.can_access_practitioner_layer()
    and exists (
    select 1 from public.practitioner_client_relationships pcr
    where pcr.practitioner_id = auth.uid()
      and pcr.client_id = practice_logs.user_id
      and pcr.status = 'active'
    )
  )
);

drop policy if exists "practice_logs_insert_own" on public.practice_logs;
create policy "practice_logs_insert_own"
on public.practice_logs for insert
with check (user_id = auth.uid());

drop policy if exists "resource_download_events_select_own_or_admin" on public.resource_download_events;
create policy "resource_download_events_select_own_or_admin"
on public.resource_download_events for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "practitioner_relationships_select_related" on public.practitioner_client_relationships;
create policy "practitioner_relationships_select_related"
on public.practitioner_client_relationships for select
using (
  (
    practitioner_id = auth.uid()
    and public.can_access_practitioner_layer()
  )
  or client_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "practitioner_notes_select_practitioner_or_admin" on public.practitioner_notes;
create policy "practitioner_notes_select_practitioner_or_admin"
on public.practitioner_notes for select
using (
  public.is_admin()
  or (
    practitioner_id = auth.uid()
    and public.can_access_practitioner_layer()
  )
);

drop policy if exists "practitioner_notes_insert_practitioner" on public.practitioner_notes;
create policy "practitioner_notes_insert_practitioner"
on public.practitioner_notes for insert
with check (
  practitioner_id = auth.uid()
  and public.can_access_practitioner_layer()
);

drop policy if exists "license_orgs_select_member_or_admin" on public.license_organizations;
create policy "license_orgs_select_member_or_admin"
on public.license_organizations for select
using (
  public.is_admin()
  or (
    public.can_access_license_layer()
    and license_holder_id = auth.uid()
    and status = 'active'
    and (expires_at is null or expires_at > now())
  )
  or (
    public.can_access_license_layer()
    and exists (
    select 1 from public.license_memberships lm
    where lm.organization_id = license_organizations.id
      and lm.user_id = auth.uid()
      and lm.status = 'active'
    )
  )
);

drop policy if exists "license_memberships_select_self_holder_or_admin" on public.license_memberships;
create policy "license_memberships_select_self_holder_or_admin"
on public.license_memberships for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.can_access_license_layer()
    and exists (
    select 1 from public.license_organizations lo
    where lo.id = license_memberships.organization_id
      and lo.license_holder_id = auth.uid()
      and lo.status = 'active'
      and (lo.expires_at is null or lo.expires_at > now())
    )
  )
);

drop policy if exists "cohorts_select_member_facilitator_holder_or_admin" on public.cohorts;
create policy "cohorts_select_member_facilitator_holder_or_admin"
on public.cohorts for select
using (
  public.is_admin()
  or (
    facilitator_id = auth.uid()
    and (
      public.can_access_practitioner_layer()
      or public.can_access_license_layer()
    )
  )
  or exists (
    select 1 from public.cohort_memberships cm
    where cm.cohort_id = cohorts.id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
  or (
    public.can_access_license_layer()
    and exists (
    select 1 from public.license_organizations lo
    where lo.id = cohorts.organization_id
      and lo.license_holder_id = auth.uid()
      and lo.status = 'active'
      and (lo.expires_at is null or lo.expires_at > now())
    )
  )
);

drop policy if exists "cohort_memberships_select_self_facilitator_holder_or_admin" on public.cohort_memberships;
create policy "cohort_memberships_select_self_facilitator_holder_or_admin"
on public.cohort_memberships for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.can_access_practitioner_layer()
    and exists (
    select 1 from public.cohorts c
    where c.id = cohort_memberships.cohort_id
      and c.facilitator_id = auth.uid()
    )
  )
  or (
    public.can_access_license_layer()
    and exists (
    select 1 from public.cohorts c
    join public.license_organizations lo on lo.id = c.organization_id
    where c.id = cohort_memberships.cohort_id
      and lo.license_holder_id = auth.uid()
      and lo.status = 'active'
      and (lo.expires_at is null or lo.expires_at > now())
    )
  )
);

drop policy if exists "cohort_protocol_runs_select_member_facilitator_holder_or_admin" on public.cohort_protocol_runs;
create policy "cohort_protocol_runs_select_member_facilitator_holder_or_admin"
on public.cohort_protocol_runs for select
using (
  public.is_admin()
  or (
    public.can_access_practitioner_layer()
    and exists (
    select 1 from public.cohorts c
    where c.id = cohort_protocol_runs.cohort_id
      and c.facilitator_id = auth.uid()
    )
  )
  or exists (
    select 1 from public.cohort_memberships cm
    where cm.cohort_id = cohort_protocol_runs.cohort_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
  or (
    public.can_access_license_layer()
    and exists (
    select 1 from public.cohorts c
    join public.license_organizations lo on lo.id = c.organization_id
    where c.id = cohort_protocol_runs.cohort_id
      and lo.license_holder_id = auth.uid()
      and lo.status = 'active'
      and (lo.expires_at is null or lo.expires_at > now())
    )
  )
);

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin"
on public.admin_audit_log for select
using (public.is_admin());

drop policy if exists "admin_audit_log_insert_admin" on public.admin_audit_log;
create policy "admin_audit_log_insert_admin"
on public.admin_audit_log for insert
with check (public.is_admin());

drop policy if exists "admin_only_product_mappings" on public.stripe_product_mappings;
create policy "admin_only_product_mappings"
on public.stripe_product_mappings for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_only_purchases" on public.purchases;
create policy "admin_only_purchases"
on public.purchases for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_only_webhook_events" on public.webhook_events;
create policy "admin_only_webhook_events"
on public.webhook_events for all
using (public.is_admin())
with check (public.is_admin());

create unique index if not exists profiles_email_normalized_unique_idx on public.profiles (email_normalized);
create index if not exists entitlements_user_protocol_idx on public.protocol_entitlements (user_id, protocol_id, status);
create unique index if not exists protocol_entitlements_unique_active_global
on public.protocol_entitlements (user_id, entitlement_type)
where status in ('active', 'pending') and protocol_id is null;
create index if not exists purchases_email_normalized_idx on public.purchases (email_normalized);
create unique index if not exists purchases_checkout_session_unique_idx on public.purchases (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists purchases_payment_intent_unique_idx on public.purchases (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists purchases_stripe_customer_idx on public.purchases (stripe_customer_id);
create index if not exists practitioner_client_idx on public.practitioner_client_relationships (practitioner_id, client_id, status);
create unique index if not exists practitioner_client_unique_general_idx
on public.practitioner_client_relationships (practitioner_id, client_id)
where protocol_id is null;
create unique index if not exists practitioner_client_unique_protocol_idx
on public.practitioner_client_relationships (practitioner_id, client_id, protocol_id)
where protocol_id is not null;
create index if not exists license_memberships_user_idx on public.license_memberships (user_id, status);
create unique index if not exists license_protocol_access_unique_global_idx
on public.license_protocol_access (organization_id, entitlement_type)
where protocol_id is null;
create index if not exists cohort_memberships_user_idx on public.cohort_memberships (user_id, status);
create index if not exists resource_download_events_user_idx on public.resource_download_events (user_id, resource_asset_id, created_at);
