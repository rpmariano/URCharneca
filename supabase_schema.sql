-- ============================================================================
-- U.R. CHARNECA ATLETISMO ("ARMADA AZUL") — SUPABASE SCHEMA
-- Suporta: Perfis (Admin / Atleta), Menores (autónomos ou até 2 adultos),
-- Provas (múltiplos veículos, documentos Troféu Cascais), Inscrições,
-- Eventos/Treinos, Comunicados, Épocas & Registos do Troféu de Cascais.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PERFIS DE ATLETAS E ADMINISTRADORES
create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique,
  name text not null,
  nickname text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'athlete' check (role in ('admin', 'athlete')),
  login_authorized boolean not null default false,
  login_email text,
  login_provider text check (login_provider in ('google', 'email')),
  login_activated_at timestamptz,
  is_minor_account boolean not null default false,
  gender text check (gender in ('M', 'F')),
  birth_date text not null default '',
  escalao text not null default 'Seniores M',
  nif text not null default '',
  cc_number text not null default '',
  club_member_number text,
  federation_number text,
  dorsal_trofeu text,
  dorsais_trofeu jsonb not null default '{}'::jsonb,
  created_from_trofeu boolean not null default false,
  needs_admin_review boolean not null default false,
  trofeu_seasons text[] not null default '{}'::text[],
  address text,
  city text,
  postal_code text,
  emergency_name text,
  emergency_phone text,
  emergency_relation text,
  shirt_size text not null default 'M',
  shorts_size text,
  height_cm numeric,
  weight_kg numeric,
  blood_type text,
  medical_notes text,
  has_official_kit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ATLETAS MENORES / JOVENS
create table if not exists public.youth_athletes (
  id text primary key,
  auth_user_id uuid unique,
  name text not null,
  gender text check (gender in ('M', 'F')),
  birth_date text not null default '',
  escalao text not null default 'Benjamins A (Sub-10)',
  nif text not null default '',
  cc_number text,
  shirt_size text default 'Criança',
  emergency_notes text,
  medical_notes text,
  dorsal_trofeu text,
  dorsais_trofeu jsonb not null default '{}'::jsonb,
  created_from_trofeu boolean not null default false,
  needs_admin_review boolean not null default false,
  trofeu_seasons text[] not null default '{}'::text[],
  can_self_manage boolean not null default false,
  email text,
  phone text,
  login_email text,
  login_provider text check (login_provider in ('google', 'email')),
  login_activated_at timestamptz,
  associated_adult_ids text[] not null default '{}'::text[]
    check (coalesce(array_length(associated_adult_ids, 1), 0) <= 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. PROVAS / CORRIDAS (Troféu de Cascais, Clube, Sugeridas por Atletas)
create table if not exists public.races (
  id text primary key,
  title text not null,
  category text not null check (category in ('trofeu_cascais', 'equipa', 'individual')),
  date text not null,
  start_time text not null,
  location text not null,
  meeting_point text,
  meeting_time text,
  distances jsonb not null default '["10 km"]'::jsonb,
  registration_deadline text,
  external_url text,
  image_url text,
  description text,
  van_available boolean not null default false,
  van_capacity integer not null default 0,
  vehicles jsonb not null default '[]'::jsonb,
  van_departure_time text,
  van_departure_location text default 'Sociedade U.R. Charneca',
  bib_pickup_info text,
  counts_for_trophy boolean not null default false,
  trophy_stage_number integer,
  trofeu_competition_id integer,
  organizer text,
  documents jsonb not null default '[]'::jsonb,
  last_doc_check_at text,
  next_doc_check_at text,
  open_to_children boolean not null default false,
  children_distances jsonb not null default '[]'::jsonb,
  created_by text not null default 'ath-rui-mariano',
  created_by_name text not null default 'Administrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. INSCRIÇÕES EM PROVAS, TRANSPORTE (MULTI-VEÍCULO) E DORSAIS
create table if not exists public.race_registrations (
  id text primary key,
  race_id text not null references public.races(id) on delete cascade,
  athlete_id text not null,
  athlete_name text not null,
  is_dependent boolean not null default false,
  dependent_id text,
  parent_name text,
  escalao text not null,
  distance text not null,
  status text not null default 'interested' check (status in ('interested', 'enrolled_by_admin', 'self_enrolled', 'cancelled')),
  transport_mode text not null default 'own_transport' check (
    transport_mode in ('van_roundtrip', 'van_return_only', 'carpool_offer', 'carpool_need', 'meeting_point', 'own_transport')
  ),
  vehicle_id text,
  carpool_seats integer,
  bib_number text,
  bib_status text not null default 'pending' check (bib_status in ('pending', 'at_club', 'delivered')),
  bib_pickup_by text,
  bib_transfer_available boolean not null default false,
  bib_transferred_from text,
  result_time text,
  trophy_points integer,
  notes text,
  van_requested_at text,
  created_at text not null
);

-- 5. TREINOS E EVENTOS / CONVÍVIOS / REUNIÕES
create table if not exists public.team_events (
  id text primary key,
  title text not null,
  type text not null check (type in ('training', 'social', 'meeting')),
  date text not null,
  time text not null,
  location text not null,
  description text not null default '',
  workout_plan text,
  requires_official_kit boolean not null default false,
  image_url text,
  created_by_name text not null,
  attendees jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. NOTIFICAÇÕES E COMUNICADOS
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  type text not null default 'general' check (
    type in ('race_open', 'deadline', 'bibs_ready', 'transport', 'general', 'individual_share', 'trofeu_sync', 'athlete_detected', 'new_document')
  ),
  related_race_id text references public.races(id) on delete set null,
  created_by_name text not null,
  created_at text not null,
  pinned boolean not null default false,
  read_by jsonb not null default '[]'::jsonb
);

-- 7. ÉPOCAS E CLASSIFICAÇÕES DO TROFÉU DE CASCAIS
create table if not exists public.trofeu_seasons (
  season text primary key,
  edition_number integer not null,
  status text not null check (status in ('open', 'completed')),
  regulation_url text not null,
  awarded_individual_pdf text,
  awarded_collective_pdf text,
  stages jsonb not null default '[]'::jsonb,
  club_standings jsonb not null default '[]'::jsonb,
  athlete_standings jsonb not null default '[]'::jsonb,
  last_synced_at text not null
);

-- 8. REGISTOS DE SINCRONIZAÇÃO COM O TROFÉU DE CASCAIS
create table if not exists public.trofeu_sync_logs (
  id text primary key,
  timestamp text not null,
  trigger text not null check (trigger in ('auto_biweekly', 'manual_admin', 'startup')),
  races_created integer not null default 0,
  races_updated integer not null default 0,
  new_documents_found integer not null default 0,
  new_athletes_created integer not null default 0,
  summary text not null
);

-- 9. SUBSCRIÇÕES WEB PUSH
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id text references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ÍNDICES DE CHAVES ESTRANGEIRAS E PESQUISAS FREQUENTES
create index if not exists idx_race_registrations_race_id on public.race_registrations (race_id);
create index if not exists idx_race_registrations_athlete_id on public.race_registrations (athlete_id);
create index if not exists idx_race_registrations_dependent_id on public.race_registrations (dependent_id) where dependent_id is not null;
create index if not exists idx_notifications_related_race_id on public.notifications (related_race_id) where related_race_id is not null;
create index if not exists idx_push_subscriptions_profile_id on public.push_subscriptions (profile_id) where profile_id is not null;
create index if not exists idx_races_date on public.races (date);
create index if not exists idx_races_category on public.races (category);
create index if not exists idx_profiles_login_email on public.profiles (lower(login_email)) where login_email is not null;
create index if not exists idx_youth_athletes_login_email on public.youth_athletes (lower(login_email)) where login_email is not null;

-- PERMISSÕES DATA API E ROW LEVEL SECURITY (RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.youth_athletes enable row level security;
alter table public.races enable row level security;
alter table public.race_registrations enable row level security;
alter table public.team_events enable row level security;
alter table public.notifications enable row level security;
alter table public.trofeu_seasons enable row level security;
alter table public.trofeu_sync_logs enable row level security;
alter table public.push_subscriptions enable row level security;

-- Sem políticas para anon/authenticated: o acesso fica negado até a fase de autenticação (Supabase Auth)
-- criar políticas por papel. Ver supabase/migrations/20261123_lockdown.sql.
