
-- ============================================================
-- neon\migrations\0001_distinct_character_neon_schema.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- Neon Postgres schema.
-- This replaces Supabase Auth/RLS with Clerk-managed user identity.

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
    'woocommerce_checkout',
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
  id text primary key,
  clerk_user_id text not null unique,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  full_name text,
  primary_role public.user_role not null default 'dtc_client',
  onboarding_complete boolean not null default false,
  terms_version text,
  terms_accepted_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  granted_by text references public.profiles(id),
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

create table if not exists public.woocommerce_product_mappings (
  id uuid primary key default gen_random_uuid(),
  woocommerce_product_id text not null,
  woocommerce_variation_id text,
  woocommerce_sku text,
  internal_product_key text not null,
  product_display_name text,
  entitlement_type public.entitlement_type not null,
  protocol_id text references public.protocols(id),
  role_granted public.user_role,
  access_duration_days integer,
  grant_child_protocols boolean not null default false,
  mapping_metadata jsonb not null default '{}'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete set null,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  source public.purchase_source not null,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_product_id text,
  stripe_price_id text,
  woocommerce_order_id text,
  woocommerce_order_key text,
  woocommerce_product_id text,
  woocommerce_variation_id text,
  woocommerce_line_item_id text,
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
  user_id text not null references public.profiles(id) on delete cascade,
  entitlement_type public.entitlement_type not null default 'protocol',
  protocol_id text references public.protocols(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  source public.purchase_source not null default 'admin_grant',
  status public.access_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by text references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_target_required check (
    protocol_id is not null
    or entitlement_type in ('practitioner_layer', 'resource_library', 'masterclass', 'license_seat', 'cohort', 'certification')
  )
);

create table if not exists public.protocol_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
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
  user_id text not null references public.profiles(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  assessment_key text not null,
  phase_key text,
  score jsonb not null default '{}'::jsonb,
  notes text,
  submitted_at timestamptz not null default now()
);

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  protocol_id text not null references public.protocols(id) on delete cascade,
  practice_key text not null,
  state_before text,
  state_after text,
  context_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_download_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  resource_asset_id text not null references public.resource_assets(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete set null,
  access_granted boolean not null,
  denial_reason text,
  signed_url_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.practitioner_profiles (
  user_id text primary key references public.profiles(id) on delete cascade,
  business_name text,
  credential_summary text,
  access_status public.access_status not null default 'pending',
  purchased_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practitioner_client_relationships (
  id uuid primary key default gen_random_uuid(),
  practitioner_id text not null references public.profiles(id) on delete cascade,
  client_id text not null references public.profiles(id) on delete cascade,
  protocol_id text references public.protocols(id) on delete set null,
  status public.access_status not null default 'active',
  client_consented_at timestamptz,
  practitioner_assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (practitioner_id, client_id, protocol_id)
);

create table if not exists public.practitioner_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id text not null references public.profiles(id) on delete cascade,
  client_id text not null references public.profiles(id) on delete cascade,
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
  license_holder_id text references public.profiles(id) on delete set null,
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
  user_id text not null references public.profiles(id) on delete cascade,
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
  facilitator_id text references public.profiles(id) on delete set null,
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
  user_id text not null references public.profiles(id) on delete cascade,
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
  admin_user_id text references public.profiles(id) on delete set null,
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

create or replace function public.has_role(check_user_id text, check_role public.user_role)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = check_user_id
      and ura.role = check_role
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.primary_role = check_role
  );
$$;

create or replace function public.is_admin(check_user_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.has_role(check_user_id, 'admin'::public.user_role);
$$;

create or replace function public.has_active_entitlement(
  check_user_id text,
  check_type public.entitlement_type,
  check_protocol_id text default null
)
returns boolean
language sql
stable
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

create or replace function public.has_any_active_entitlement(check_user_id text)
returns boolean
language sql
stable
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

create or replace function public.can_access_protocol(check_user_id text, check_protocol_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_admin(check_user_id)
  or exists (
    select 1
    from public.protocol_entitlements pe
    where pe.user_id = check_user_id
      and pe.protocol_id = check_protocol_id
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
  )
  or exists (
    select 1
    from public.protocol_entitlements pe
    join public.bundle_protocols bp on bp.bundle_protocol_id = pe.protocol_id
    where pe.user_id = check_user_id
      and pe.entitlement_type = 'bundle'
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and bp.child_protocol_id = check_protocol_id
  );
$$;

create or replace function public.can_access_practitioner_layer(check_user_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_admin(check_user_id)
  or exists (
    select 1
    from public.protocol_entitlements pe
    join public.practitioner_profiles pp on pp.user_id = pe.user_id
    where pe.user_id = check_user_id
      and pe.entitlement_type = 'practitioner_layer'
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and pp.access_status = 'active'
      and public.has_role(check_user_id, 'practitioner'::public.user_role)
  );
$$;

create or replace function public.can_download_resource(check_user_id text, check_resource_asset_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.resource_assets ra
    where ra.id = check_resource_asset_id
      and ra.active = true
      and ra.downloadable = true
      and (
        public.is_admin(check_user_id)
        or (
          ra.practitioner_only = true
          and public.can_access_practitioner_layer(check_user_id)
          and (
            ra.protocol_id is null
            or public.can_access_protocol(check_user_id, ra.protocol_id)
          )
        )
        or (
          ra.practitioner_only = false
          and (
            (ra.protocol_id is not null and public.can_access_protocol(check_user_id, ra.protocol_id))
            or (ra.protocol_id is null and public.has_any_active_entitlement(check_user_id))
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

drop trigger if exists woocommerce_product_mappings_touch_updated_at on public.woocommerce_product_mappings;
create trigger woocommerce_product_mappings_touch_updated_at
before update on public.woocommerce_product_mappings
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

drop trigger if exists practitioner_profiles_touch_updated_at on public.practitioner_profiles;
create trigger practitioner_profiles_touch_updated_at
before update on public.practitioner_profiles
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

create unique index if not exists profiles_email_normalized_unique_idx on public.profiles (email_normalized);
create index if not exists profiles_clerk_user_id_idx on public.profiles (clerk_user_id);
create index if not exists entitlements_user_protocol_idx on public.protocol_entitlements (user_id, protocol_id, status);
create unique index if not exists protocol_entitlements_unique_active_protocol
on public.protocol_entitlements (user_id, protocol_id, entitlement_type)
where status in ('active', 'pending') and protocol_id is not null;
create unique index if not exists protocol_entitlements_unique_active_global
on public.protocol_entitlements (user_id, entitlement_type)
where status in ('active', 'pending') and protocol_id is null;
create index if not exists purchases_email_normalized_idx on public.purchases (email_normalized);
create unique index if not exists purchases_checkout_session_unique_idx on public.purchases (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists purchases_payment_intent_unique_idx on public.purchases (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index if not exists purchases_woocommerce_order_line_unique_idx
on public.purchases (woocommerce_order_id, woocommerce_line_item_id)
where woocommerce_order_id is not null and woocommerce_line_item_id is not null;
create index if not exists purchases_stripe_customer_idx on public.purchases (stripe_customer_id);
create index if not exists purchases_woocommerce_order_idx on public.purchases (woocommerce_order_id) where woocommerce_order_id is not null;
create unique index if not exists woocommerce_product_mappings_product_variation_unique_idx
on public.woocommerce_product_mappings (woocommerce_product_id, coalesce(woocommerce_variation_id, ''));
create unique index if not exists woocommerce_product_mappings_sku_unique_idx
on public.woocommerce_product_mappings (woocommerce_sku)
where woocommerce_sku is not null;
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


-- ============================================================
-- neon\migrations\0002_seed_protocol_catalog_and_mapping_placeholders.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- Protocol catalog and Stripe mapping placeholders
-- Replace placeholder Stripe IDs only after live credentials and product IDs are available.

insert into public.protocols (id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description)
values
  ('DC-P01-SBP', 'somatic-baseline', 'Somatic Baseline Protocol', 'Phase 1', 'active', 10, null, 'Biological foundation for behavioral governance and nervous system literacy.'),
  ('DC-P02-COG', 'cognitive-architecture', 'Cognitive Architecture', 'Phase 2', 'active', 20, null, 'Parent bundle for IOS-1, MES-1, and NCS-1.'),
  ('DC-P02-IOS', 'identity-operating-system', 'Identity Operating System', 'Phase 2A', 'active', 21, 'DC-P02-COG', 'Identity architecture protocol with handwritten processing requirements.'),
  ('DC-P02-MES', 'masking-economy-system', 'Masking Economy System', 'Phase 2B', 'active', 22, 'DC-P02-COG', 'Masking cost, protection, and resource allocation audit.'),
  ('DC-P02-NCS', 'narrative-control-system', 'Narrative Control System', 'Phase 2C', 'active', 23, 'DC-P02-COG', 'Interpretation governance and narrative calibration protocol.'),
  ('DC-P03-EXE', 'execution-architecture', 'Execution Architecture Protocol', 'Phase 3', 'active', 30, null, 'Governed execution system for capacity-aware action.'),
  ('DC-P04-REL', 'relational-command', 'Relational Command', 'Phase 4', 'active', 40, null, 'Parent bundle for Authority Framework and Internal Signal Calibration.'),
  ('DC-P04-AUT', 'authority-framework', 'Authority Framework', 'Phase 4A', 'active', 41, 'DC-P04-REL', 'Authority, soft power, and relational governance protocol.'),
  ('DC-P04-ISC', 'internal-signal-calibration', 'Internal Signal Calibration', 'Phase 4B', 'active', 42, 'DC-P04-REL', 'Internal signal fidelity and decision calibration protocol.'),
  ('DC-P05-SOV', 'sovereignty-reset', '30-Day Sovereignty Reset', 'Phase 5', 'active', 50, null, 'Timed reset container for daily governance enforcement.'),
  ('DC-P06-SMB', 'self-mastery-blueprint', 'Self-Mastery Blueprint', 'Phase 6 / Capstone', 'active', 60, null, 'Flagship capstone protocol for integrated self-mastery architecture.'),
  ('DC-P07-EIP', 'enterprise-ip-mastermind', 'Enterprise IP Mastermind', 'Tier 3', 'active', 70, null, 'Commercial incubation layer for converting self-mastery into intellectual property.'),
  ('DC-M01-AAS', 'advanced-application-series', 'Advanced Application Series', 'Expansion Layer', 'future', 90, null, 'Future masterclass and expansion layer.')
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  phase_label = excluded.phase_label,
  status = excluded.status,
  sequence_order = excluded.sequence_order,
  parent_protocol_id = excluded.parent_protocol_id,
  description = excluded.description,
  updated_at = now();

insert into public.protocol_prerequisites (protocol_id, required_protocol_id, required_completion_percent)
values
  ('DC-P02-COG', 'DC-P01-SBP', 100),
  ('DC-P03-EXE', 'DC-P02-IOS', 100),
  ('DC-P03-EXE', 'DC-P02-MES', 100),
  ('DC-P03-EXE', 'DC-P02-NCS', 100),
  ('DC-P04-REL', 'DC-P03-EXE', 100),
  ('DC-P05-SOV', 'DC-P04-REL', 100),
  ('DC-P06-SMB', 'DC-P05-SOV', 100)
on conflict (protocol_id, required_protocol_id) do update set
  required_completion_percent = excluded.required_completion_percent;

insert into public.bundle_protocols (bundle_protocol_id, child_protocol_id)
values
  ('DC-P02-COG', 'DC-P02-IOS'),
  ('DC-P02-COG', 'DC-P02-MES'),
  ('DC-P02-COG', 'DC-P02-NCS'),
  ('DC-P04-REL', 'DC-P04-AUT'),
  ('DC-P04-REL', 'DC-P04-ISC')
on conflict (bundle_protocol_id, child_protocol_id) do nothing;

insert into public.protocol_phases (protocol_id, phase_key, title, sequence_order, locked_by_default, requires_previous_phase)
values
  ('DC-P01-SBP', 'orientation', 'Orientation', 10, false, false),
  ('DC-P01-SBP', 'baseline-assessment', 'SDI Baseline Assessment', 20, true, true),
  ('DC-P01-SBP', 'biological-architecture', 'Biological Architecture', 30, true, true),
  ('DC-P01-SBP', 'vagus-nerve', 'The Vagus Nerve', 40, true, true),
  ('DC-P01-SBP', 'environmental-audit', 'Environmental Audit', 50, true, true),
  ('DC-P01-SBP', 'tactical-resets', 'Tactical Reset Protocols', 60, true, true)
on conflict (protocol_id, phase_key) do update set
  title = excluded.title,
  sequence_order = excluded.sequence_order,
  locked_by_default = excluded.locked_by_default,
  requires_previous_phase = excluded.requires_previous_phase;

insert into public.resource_assets (id, title, asset_type, protocol_id, public_path, audience, practitioner_only, downloadable, printable)
values
  ('DC-R01-BIC', 'Biological Infrastructure Companion', 'foundation_reference', null, '/resources/biological-infrastructure-companion.pdf', 'client_practitioner', false, true, true),
  ('DC-R02-12W', '12 Dimensions of Wellness', 'foundation_reference', null, '/resources/12-dimensions-wellness.pdf', 'client_practitioner', false, true, true),
  ('DC-R03-GLO', 'Distinct Character Framework Glossary', 'foundation_reference', null, '/resources/distinct-character-framework-glossary.pdf', 'client_practitioner', false, true, true),
  ('DC-R04-BSI', 'Body Signal Index', 'foundation_reference', null, '/resources/body-signal-index.pdf', 'client_practitioner', false, true, true),
  ('DC-R05-NSG', 'Nervous System Governance Guide', 'foundation_reference', null, '/resources/nervous-system-governance-guide.pdf', 'client_practitioner', false, true, true),
  ('DC-R06-NSG-ESMR', 'Nervous System Governance: Eating, Sleep, Movement, Recovery', 'foundation_reference', null, '/resources/nsg-digestion-sleep-movement-recovery.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-PC01', 'Somatic Baseline Printable Companion', 'protocol_pdf', 'DC-P01-SBP', '/resources/somatic-baseline-protocol.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-CM01', 'Somatic Baseline Companion Materials', 'companion_pdf', 'DC-P01-SBP', '/resources/somatic-baseline-companion.pdf', 'client_practitioner', false, true, true),
  ('DC-P01-SBP-TA01', 'Somatic Baseline Therapeutic Addendum', 'therapeutic_addendum', 'DC-P01-SBP', '/resources/somatic-baseline-protocol.pdf', 'practitioner', true, true, true),
  ('DC-P07-EIP-RS01', 'Enterprise IP Mastermind Resource Suite', 'commercial_incubation_resource', 'DC-P07-EIP', '/resources/enterprise-ip-mastermind-resource-suite.pdf', 'client_advisor', false, true, true),
  ('DC-P07-EIP-ADV01', 'Enterprise IP Mastermind Advisor Legal-Ops Guide', 'advisor_guide', 'DC-P07-EIP', '/resources/enterprise-ip-mastermind-advisor-guide.pdf', 'advisor_admin', true, true, true)
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

insert into public.stripe_product_mappings (
  stripe_product_id,
  stripe_price_id,
  internal_product_key,
  product_display_name,
  purchase_mode,
  entitlement_type,
  protocol_id,
  role_granted,
  access_duration_days,
  grant_child_protocols,
  seat_limit,
  mapping_metadata,
  notes,
  active
)
values
  ('prod_REPLACE_SBP', 'price_REPLACE_SBP', 'protocol_somatic_baseline', 'Somatic Baseline Protocol', 'one_time', 'protocol', 'DC-P01-SBP', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Somatic Baseline Stripe payment link product.', false),
  ('prod_REPLACE_COG', 'price_REPLACE_COG', 'bundle_cognitive_architecture', 'Cognitive Architecture Bundle', 'one_time', 'bundle', 'DC-P02-COG', 'dtc_client', null, true, null, '{"delivery_layer":"bundle","children":["DC-P02-IOS","DC-P02-MES","DC-P02-NCS"]}'::jsonb, 'Map to existing Cognitive Architecture product or bundle.', false),
  ('prod_REPLACE_EXE', 'price_REPLACE_EXE', 'protocol_execution_architecture', 'Execution Architecture Protocol', 'one_time', 'protocol', 'DC-P03-EXE', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Execution Architecture product.', false),
  ('prod_REPLACE_REL', 'price_REPLACE_REL', 'bundle_relational_command', 'Relational Command Bundle', 'one_time', 'bundle', 'DC-P04-REL', 'dtc_client', null, true, null, '{"delivery_layer":"bundle","children":["DC-P04-AUT","DC-P04-ISC"]}'::jsonb, 'Map to existing Relational Command bundle product.', false),
  ('prod_REPLACE_SOV', 'price_REPLACE_SOV', 'protocol_sovereignty_reset', '30-Day Sovereignty Reset', 'one_time', 'protocol', 'DC-P05-SOV', 'dtc_client', null, false, null, '{"delivery_layer":"protocol","supports_cohorts":true}'::jsonb, 'Map to existing 30-Day Sovereignty Reset product.', false),
  ('prod_REPLACE_SMB', 'price_REPLACE_SMB', 'protocol_self_mastery_blueprint', 'Self-Mastery Blueprint', 'one_time', 'protocol', 'DC-P06-SMB', 'dtc_client', null, false, null, '{"delivery_layer":"protocol"}'::jsonb, 'Map to existing Self-Mastery Blueprint product.', false),
  ('prod_REPLACE_EIP', 'price_REPLACE_EIP', 'enterprise_ip_mastermind', 'Enterprise IP Mastermind', 'one_time', 'protocol', 'DC-P07-EIP', 'dtc_client', null, false, null, '{"delivery_layer":"commercial_incubation","price_band":"12000_15000"}'::jsonb, 'Map to existing Enterprise IP Mastermind commercial incubation product.', false),
  ('prod_REPLACE_PRACTITIONER', 'price_REPLACE_PRACTITIONER', 'practitioner_layer_access', 'Practitioner Layer Access', 'one_time', 'practitioner_layer', null, 'practitioner', null, false, null, '{"delivery_layer":"practitioner"}'::jsonb, 'Separate practitioner pricing and access rights.', false),
  ('prod_REPLACE_LICENSE', 'price_REPLACE_LICENSE', 'license_holder_access', 'License Holder Access', 'license', 'license_seat', null, 'license_holder', null, false, null, '{"delivery_layer":"license"}'::jsonb, 'Separate license holder pricing and organization access rights.', false),
  ('prod_REPLACE_MASTERCLASS', 'price_REPLACE_MASTERCLASS', 'masterclass_advanced_application_series', 'Advanced Application Series', 'one_time', 'masterclass', 'DC-M01-AAS', 'dtc_client', null, false, null, '{"delivery_layer":"masterclass"}'::jsonb, 'Future expansion layer product.', false)
on conflict (stripe_product_id, stripe_price_id) do update set
  internal_product_key = excluded.internal_product_key,
  product_display_name = excluded.product_display_name,
  purchase_mode = excluded.purchase_mode,
  entitlement_type = excluded.entitlement_type,
  protocol_id = excluded.protocol_id,
  role_granted = excluded.role_granted,
  access_duration_days = excluded.access_duration_days,
  grant_child_protocols = excluded.grant_child_protocols,
  seat_limit = excluded.seat_limit,
  mapping_metadata = excluded.mapping_metadata,
  notes = excluded.notes,
  active = excluded.active;


-- ============================================================
-- neon\migrations\0007_activate_enterprise_ip_mastermind.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- DEV patch: Enterprise IP Mastermind is active commercial incubation, not future expansion.

update public.protocols
set
  status = 'active',
  description = 'Commercial incubation layer for converting self-mastery into intellectual property.',
  updated_at = now()
where id = 'DC-P07-EIP';

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
values
  (
    'DC-P07-EIP-RS01',
    'Enterprise IP Mastermind Resource Suite',
    'commercial_incubation_resource',
    'DC-P07-EIP',
    '/resources/enterprise-ip-mastermind-resource-suite.pdf',
    'client_advisor',
    false,
    true,
    true
  ),
  (
    'DC-P07-EIP-ADV01',
    'Enterprise IP Mastermind Advisor Legal-Ops Guide',
    'advisor_guide',
    'DC-P07-EIP',
    '/resources/enterprise-ip-mastermind-advisor-guide.pdf',
    'advisor_admin',
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
  updated_at = now();

insert into public.stripe_product_mappings (
  stripe_product_id,
  stripe_price_id,
  internal_product_key,
  product_display_name,
  purchase_mode,
  entitlement_type,
  protocol_id,
  role_granted,
  grant_child_protocols,
  mapping_metadata,
  notes,
  active
)
values
  (
    'prod_REPLACE_EIP',
    'price_REPLACE_EIP',
    'enterprise_ip_mastermind',
    'Enterprise IP Mastermind',
    'one_time',
    'protocol',
    'DC-P07-EIP',
    'dtc_client',
    false,
    '{"delivery_layer":"commercial_incubation","price_band":"12000_15000"}'::jsonb,
    'Map to existing Enterprise IP Mastermind commercial incubation product.',
    false
  )
on conflict (stripe_product_id, stripe_price_id) do update set
  internal_product_key = excluded.internal_product_key,
  product_display_name = excluded.product_display_name,
  purchase_mode = excluded.purchase_mode,
  entitlement_type = excluded.entitlement_type,
  protocol_id = excluded.protocol_id,
  role_granted = excluded.role_granted,
  grant_child_protocols = excluded.grant_child_protocols,
  mapping_metadata = excluded.mapping_metadata,
  notes = excluded.notes,
  active = excluded.active;


-- ============================================================
-- neon\migrations\0008_correct_final_protocol_numbering.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- DEV correction: final protocol numbering after ecosystem lock.
--
-- Corrects:
--   DC-P06-SOV -> DC-P05-SOV
--   DC-P07-SMB -> DC-P06-SMB
--   DC-P08-EIP -> DC-P07-EIP
--   DC-P09-AAS -> DC-M01-AAS

update public.protocols
set
  slug = 'legacy-sovereignty-reset',
  status = 'retired',
  updated_at = now()
where id = 'DC-P06-SOV';

update public.protocols
set
  slug = 'legacy-self-mastery-blueprint',
  status = 'retired',
  updated_at = now()
where id = 'DC-P07-SMB';

update public.protocols
set
  slug = 'legacy-enterprise-ip-mastermind',
  status = 'retired',
  updated_at = now()
where id = 'DC-P08-EIP';

update public.protocols
set
  slug = 'legacy-advanced-application-series',
  status = 'retired',
  updated_at = now()
where id = 'DC-P09-AAS';

insert into public.protocols (id, slug, title, phase_label, status, sequence_order, parent_protocol_id, description)
values
  ('DC-P05-SOV', 'sovereignty-reset', '30-Day Sovereignty Reset', 'Phase 5', 'active', 50, null, 'Timed reset container for daily governance enforcement.'),
  ('DC-P06-SMB', 'self-mastery-blueprint', 'Self-Mastery Blueprint', 'Phase 6 / Capstone', 'active', 60, null, 'Flagship capstone protocol for integrated self-mastery architecture.'),
  ('DC-P07-EIP', 'enterprise-ip-mastermind', 'Enterprise IP Mastermind', 'Tier 3', 'active', 70, null, 'Commercial incubation layer for converting self-mastery into intellectual property.'),
  ('DC-M01-AAS', 'advanced-application-series', 'Advanced Application Series', 'Expansion Layer', 'future', 90, null, 'Future masterclass and expansion layer.')
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  phase_label = excluded.phase_label,
  status = excluded.status,
  sequence_order = excluded.sequence_order,
  parent_protocol_id = excluded.parent_protocol_id,
  description = excluded.description,
  updated_at = now();

delete from public.protocol_prerequisites
where (protocol_id, required_protocol_id) in (
  ('DC-P05-SOV', 'DC-P04-REL'),
  ('DC-P06-SMB', 'DC-P05-SOV')
);

update public.protocol_prerequisites set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.protocol_prerequisites set required_protocol_id = 'DC-P05-SOV' where required_protocol_id = 'DC-P06-SOV';
update public.protocol_prerequisites set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.protocol_prerequisites set required_protocol_id = 'DC-P06-SMB' where required_protocol_id = 'DC-P07-SMB';
update public.protocol_prerequisites set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.protocol_prerequisites set required_protocol_id = 'DC-P07-EIP' where required_protocol_id = 'DC-P08-EIP';
update public.protocol_prerequisites set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';
update public.protocol_prerequisites set required_protocol_id = 'DC-M01-AAS' where required_protocol_id = 'DC-P09-AAS';

insert into public.protocol_prerequisites (protocol_id, required_protocol_id, required_completion_percent)
values
  ('DC-P05-SOV', 'DC-P04-REL', 100),
  ('DC-P06-SMB', 'DC-P05-SOV', 100)
on conflict (protocol_id, required_protocol_id) do update set
  required_completion_percent = excluded.required_completion_percent;

update public.bundle_protocols set bundle_protocol_id = 'DC-P05-SOV' where bundle_protocol_id = 'DC-P06-SOV';
update public.bundle_protocols set child_protocol_id = 'DC-P05-SOV' where child_protocol_id = 'DC-P06-SOV';
update public.bundle_protocols set bundle_protocol_id = 'DC-P06-SMB' where bundle_protocol_id = 'DC-P07-SMB';
update public.bundle_protocols set child_protocol_id = 'DC-P06-SMB' where child_protocol_id = 'DC-P07-SMB';
update public.bundle_protocols set bundle_protocol_id = 'DC-P07-EIP' where bundle_protocol_id = 'DC-P08-EIP';
update public.bundle_protocols set child_protocol_id = 'DC-P07-EIP' where child_protocol_id = 'DC-P08-EIP';
update public.bundle_protocols set bundle_protocol_id = 'DC-M01-AAS' where bundle_protocol_id = 'DC-P09-AAS';
update public.bundle_protocols set child_protocol_id = 'DC-M01-AAS' where child_protocol_id = 'DC-P09-AAS';

update public.protocol_phases set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.protocol_phases set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.protocol_phases set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.protocol_phases set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';

update public.resource_assets set protocol_id = 'DC-P05-SOV' where protocol_id = 'DC-P06-SOV';
update public.resource_assets set protocol_id = 'DC-P06-SMB' where protocol_id = 'DC-P07-SMB';
update public.resource_assets set protocol_id = 'DC-P07-EIP' where protocol_id = 'DC-P08-EIP';
update public.resource_assets set protocol_id = 'DC-M01-AAS' where protocol_id = 'DC-P09-AAS';

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
select
  'DC-P07-EIP-RS01',
  title,
  asset_type,
  'DC-P07-EIP',
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
from public.resource_assets
where id = 'DC-P08-EIP-RS01'
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  storage_path = excluded.storage_path,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

insert into public.resource_assets (
  id,
  title,
  asset_type,
  protocol_id,
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
)
select
  'DC-P07-EIP-ADV01',
  title,
  asset_type,
  'DC-P07-EIP',
  storage_path,
  public_path,
  audience,
  practitioner_only,
  downloadable,
  printable
from public.resource_assets
where id = 'DC-P08-EIP-ADV01'
on conflict (id) do update set
  title = excluded.title,
  asset_type = excluded.asset_type,
  protocol_id = excluded.protocol_id,
  storage_path = excluded.storage_path,
  public_path = excluded.public_path,
  audience = excluded.audience,
  practitioner_only = excluded.practitioner_only,
  downloadable = excluded.downloadable,
  printable = excluded.printable,
  updated_at = now();

update public.resource_download_events set resource_asset_id = 'DC-P07-EIP-RS01' where resource_asset_id = 'DC-P08-EIP-RS01';
update public.resource_download_events set resource_asset_id = 'DC-P07-EIP-ADV01' where resource_asset_id = 'DC-P08-EIP-ADV01';

delete from public.resource_assets where id in ('DC-P08-EIP-RS01', 'DC-P08-EIP-ADV01');

update public.stripe_product_mappings
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.protocol_entitlements
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.protocol_progress
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.assessment_logs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practice_logs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.resource_download_events
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practitioner_client_relationships
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.practitioner_notes
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.license_protocol_access
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.cohorts
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

update public.cohort_protocol_runs
set protocol_id = case protocol_id
  when 'DC-P06-SOV' then 'DC-P05-SOV'
  when 'DC-P07-SMB' then 'DC-P06-SMB'
  when 'DC-P08-EIP' then 'DC-P07-EIP'
  when 'DC-P09-AAS' then 'DC-M01-AAS'
  else protocol_id
end
where protocol_id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');

delete from public.protocols
where id in ('DC-P06-SOV', 'DC-P07-SMB', 'DC-P08-EIP', 'DC-P09-AAS');


-- ============================================================
-- neon\migrations\0009_store_stripe_product_ids_and_payment_links.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- DEV Stripe mapping update: store real product IDs and payment links.
--
-- Price IDs are still pending. Keep mappings inactive until each price_... ID is added
-- and webhook validation is implemented.

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesfBwqPBseoKQ',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/8x2bJ0a5GdpHgPd4Ee08g0e'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesBDIrW1NwlBx',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/bJe28qgu4bhzeH5b2C08g0f'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UOYnAX7M7oK8Pc',
  product_display_name = 'Execution Architecture Protocol',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/3cIaEW1za5Xf1UjeeO08g0a'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesU5fm4d0iOLU',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/4gMeVc3Hi0CV0QffiS08g0g'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_U6LEDJkTFxXDVT',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/cNi8wOgu45XfeH58Uu08g0h'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UestZO2AWeKqDB',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/6oUbJ00v62L3gPd4Ee08g0i'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_Uet0jBSdTn7D1M',
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/5kQeVc6TudpHaqP6Mm08g0j'
  ),
  notes = 'Stripe product ID and payment link recorded. Price ID pending before activation.',
  active = false
where internal_product_key = 'enterprise_ip_mastermind';



-- ============================================================
-- neon\migrations\0010_activate_stripe_price_mappings.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- DEV Stripe mapping update: add real price IDs and activate current product mappings.
--
-- This activates mapping records only. Live Stripe webhooks still require server-side
-- implementation, secret keys, and webhook signing verification before production use.

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesfBwqPBseoKQ',
  stripe_price_id = 'price_1TfYuJAjPDAuKfvkb1CJSo0V',
  product_display_name = 'Somatic Baseline Protocol',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P01-SBP',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/8x2bJ0a5GdpHgPd4Ee08g0e'
  ),
  notes = 'Active Stripe mapping for Somatic Baseline Protocol.',
  active = true
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesBDIrW1NwlBx',
  stripe_price_id = 'price_1TfYQoAjPDAuKfvkewHqADfT',
  product_display_name = 'Cognitive Architecture Bundle',
  entitlement_type = 'bundle',
  protocol_id = 'DC-P02-COG',
  grant_child_protocols = true,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/bJe28qgu4bhzeH5b2C08g0f',
    'children',
    jsonb_build_array('DC-P02-IOS', 'DC-P02-MES', 'DC-P02-NCS')
  ),
  notes = 'Active Stripe mapping for Cognitive Architecture Bundle.',
  active = true
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UOYnAX7M7oK8Pc',
  stripe_price_id = 'price_1TPlfTAjPDAuKfvkwfliFljA',
  product_display_name = 'Execution Architecture Protocol',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P03-EXE',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/3cIaEW1za5Xf1UjeeO08g0a'
  ),
  notes = 'Active Stripe mapping for Execution Architecture Protocol.',
  active = true
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UesU5fm4d0iOLU',
  stripe_price_id = 'price_1TfYjPAjPDAuKfvkkxZVNU66',
  product_display_name = 'Relational Command Bundle',
  entitlement_type = 'bundle',
  protocol_id = 'DC-P04-REL',
  grant_child_protocols = true,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/4gMeVc3Hi0CV0QffiS08g0g',
    'children',
    jsonb_build_array('DC-P04-AUT', 'DC-P04-ISC')
  ),
  notes = 'Active Stripe mapping for Relational Command Bundle.',
  active = true
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_U6LEDJkTFxXDVT',
  stripe_price_id = 'price_1T88XeAjPDAuKfvkaJiHOAmm',
  product_display_name = '30-Day Sovereignty Reset',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P05-SOV',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/cNi8wOgu45XfeH58Uu08g0h',
    'supports_cohorts',
    true
  ),
  notes = 'Active Stripe mapping for 30-Day Sovereignty Reset.',
  active = true
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_UestZO2AWeKqDB',
  stripe_price_id = 'price_1TfZ7JAjPDAuKfvkOj8lh3pN',
  product_display_name = 'Self-Mastery Blueprint',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P06-SMB',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/6oUbJ00v62L3gPd4Ee08g0i'
  ),
  notes = 'Active Stripe mapping for Self-Mastery Blueprint.',
  active = true
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  stripe_product_id = 'prod_Uet0jBSdTn7D1M',
  stripe_price_id = 'price_1TfZE2AjPDAuKfvk6WKQUwpn',
  product_display_name = 'The Enterprise IP Mastermind',
  entitlement_type = 'protocol',
  protocol_id = 'DC-P07-EIP',
  grant_child_protocols = false,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'payment_link',
    'https://buy.stripe.com/5kQeVc6TudpHaqP6Mm08g0j',
    'delivery_layer',
    'commercial_incubation',
    'price_band',
    '12000_15000'
  ),
  notes = 'Active Stripe mapping for Enterprise IP Mastermind commercial incubation.',
  active = true
where internal_product_key = 'enterprise_ip_mastermind';



-- ============================================================
-- neon\migrations\0016_set_portal_access_duration_timelines.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- Product access duration policy from DC - Structured Ecosystem 2026.
--
-- Access policy:
-- - Each product has its own maximum completion window.
-- - Portal access remains available for seven calendar days after formal completion.
-- - Access ends at the maximum product window even when completion is not marked.

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_somatic_baseline';

update public.stripe_product_mappings
set
  access_duration_days = 90,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '90 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 90 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'bundle_cognitive_architecture';

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_execution_architecture';

update public.stripe_product_mappings
set
  access_duration_days = 90,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '90 days',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 90 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'bundle_relational_command';

update public.stripe_product_mappings
set
  access_duration_days = 60,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '60 days',
    'completion_closeout_days', 7,
    'completion_requirement', 'Complete one uninterrupted 30-day Sovereignty cycle within 60 calendar days.'
  ),
  notes = 'Portal access window: 60 days. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_sovereignty_reset';

update public.stripe_product_mappings
set
  access_duration_days = 112,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '16 weeks',
    'curriculum_window', '14 weeks',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 16 weeks. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'protocol_self_mastery_blueprint';

update public.stripe_product_mappings
set
  access_duration_days = 98,
  mapping_metadata = coalesce(mapping_metadata, '{}'::jsonb) || jsonb_build_object(
    'portal_access_window', '14 weeks',
    'curriculum_window', '12 weeks',
    'completion_closeout_days', 7
  ),
  notes = 'Portal access window: 14 weeks. Completion closeout: 7 days after formal completion.',
  updated_at = now()
where internal_product_key = 'enterprise_ip_mastermind';

-- Backfill any already-claimed Stripe entitlements that were created before
-- access_duration_days was populated. Existing manually extended expiration dates
-- are left alone.
update public.protocol_entitlements pe
set
  expires_at = pe.starts_at + make_interval(days => spm.access_duration_days),
  updated_at = now()
from public.purchases pu
join public.stripe_product_mappings spm
  on (
    (pu.stripe_price_id is not null and pu.stripe_price_id = spm.stripe_price_id)
    or
    (pu.stripe_product_id is not null and pu.stripe_product_id = spm.stripe_product_id)
  )
where pe.purchase_id = pu.id
  and pe.expires_at is null
  and pe.status = 'active'
  and spm.access_duration_days is not null;


-- ============================================================
-- neon\migrations\0017_add_self_mastery_relapse_reentry_ledger.sql
-- ============================================================

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


-- ============================================================
-- neon\migrations\0018_add_woocommerce_purchase_access.sql
-- ============================================================

-- Distinct Character Protocol Portal
-- Adds WooCommerce purchase-to-access support.

alter type public.purchase_source add value if not exists 'woocommerce_checkout';

create table if not exists public.woocommerce_product_mappings (
  id uuid primary key default gen_random_uuid(),
  woocommerce_product_id text not null,
  woocommerce_variation_id text,
  woocommerce_sku text,
  internal_product_key text not null,
  product_display_name text,
  entitlement_type public.entitlement_type not null,
  protocol_id text references public.protocols(id),
  role_granted public.user_role,
  access_duration_days integer,
  grant_child_protocols boolean not null default false,
  mapping_metadata jsonb not null default '{}'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchases
  add column if not exists woocommerce_order_id text,
  add column if not exists woocommerce_order_key text,
  add column if not exists woocommerce_product_id text,
  add column if not exists woocommerce_variation_id text,
  add column if not exists woocommerce_line_item_id text;

create unique index if not exists woocommerce_product_mappings_product_variation_unique_idx
on public.woocommerce_product_mappings (
  woocommerce_product_id,
  coalesce(woocommerce_variation_id, '')
);

create unique index if not exists woocommerce_product_mappings_sku_unique_idx
on public.woocommerce_product_mappings (woocommerce_sku)
where woocommerce_sku is not null;

create unique index if not exists purchases_woocommerce_order_line_unique_idx
on public.purchases (woocommerce_order_id, woocommerce_line_item_id)
where woocommerce_order_id is not null and woocommerce_line_item_id is not null;

create index if not exists purchases_woocommerce_order_idx
on public.purchases (woocommerce_order_id)
where woocommerce_order_id is not null;

insert into public.admin_audit_log (
  admin_user_id,
  action,
  target_table,
  metadata
)
values (
  null,
  'woocommerce_purchase_access_schema_added',
  'woocommerce_product_mappings',
  jsonb_build_object(
    'migration', '0018_add_woocommerce_purchase_access',
    'requires_mapping_rows', true
  )
);

