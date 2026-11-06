-- ============================================================================
-- U.R. CHARNECA ATLETISMO ("ARMADA AZUL") — SUPABASE SCHEMA
-- Dois perfis: 'admin' (Administrador) e 'athlete' (Atleta)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. PERFIS DE ATLETAS E ADMINISTRADORES
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,
  name text not null,
  nickname text,
  email text unique not null,
  phone text,
  role text not null default 'athlete' check (role in ('admin', 'athlete')),
  birth_date date,
  escalao text default 'Seniores M',
  nif text,
  cc_number text,
  shirt_size text default 'M',
  has_official_kit boolean default true,
  dependents jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 2. PROVAS / CORRIDAS (Troféu de Cascais, Inscrição Equipa, Individual Partilhada)
create table if not exists public.races (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null check (category in ('trofeu_cascais', 'equipa', 'individual')),
  date date not null,
  start_time text not null,
  location text not null,
  meeting_point text,
  meeting_time text,
  distances jsonb not null default '["10 km"]'::jsonb,
  registration_deadline date,
  external_url text,
  description text,
  van_available boolean default false,
  van_capacity integer default 9,
  van_departure_time text,
  van_departure_location text default 'Sociedade U.R. Charneca',
  bib_pickup_info text,
  counts_for_trophy boolean default false,
  trophy_stage_number integer,
  open_to_children boolean default false,
  children_distances text[],
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz default now()
);

-- 3. INSCRIÇÕES EM PROVAS, TRANSPORTE E DORSAIS
create table if not exists public.race_registrations (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid not null references public.races(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  athlete_name text not null,
  is_dependent boolean default false,
  dependent_id text,
  escalao text,
  distance text not null,
  status text not null default 'interested' check (status in ('interested', 'enrolled_by_admin', 'self_enrolled', 'cancelled')),
  transport_mode text not null default 'own_transport' check (
    transport_mode in ('van_roundtrip', 'van_return_only', 'carpool_offer', 'carpool_need', 'meeting_point', 'own_transport')
  ),
  carpool_seats integer default 0,
  bib_number text,
  bib_status text not null default 'pending' check (bib_status in ('pending', 'at_club', 'delivered')),
  bib_pickup_by text,
  van_requested_at timestamptz,
  bib_transfer_available boolean default false,
  bib_transferred_from text,
  result_time text,
  trophy_points integer,
  notes text,
  created_at timestamptz default now()
);

-- 4. TREINOS E CONVÍVIOS / REUNIÕES
create table if not exists public.team_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null check (type in ('training', 'social', 'meeting')),
  date date not null,
  time text not null,
  location text not null,
  description text,
  workout_plan text,
  image_url text,
  requires_official_kit boolean default false,
  created_by_name text,
  attendees jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 5. NOTIFICAÇÕES E AVISOS
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  type text not null default 'general' check (
    type in ('race_open', 'deadline', 'bibs_ready', 'transport', 'general', 'individual_share')
  ),
  related_race_id uuid references public.races(id) on delete set null,
  created_by_name text not null,
  pinned boolean default false,
  read_by jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 6. SUBSCRIÇÕES WEB PUSH
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- RLS BÁSICA
alter table public.profiles enable row level security;
alter table public.races enable row level security;
alter table public.race_registrations enable row level security;
alter table public.team_events enable row level security;
alter table public.notifications enable row level security;

create policy "Leitura pública para equipa autenticada - profiles" on public.profiles for select using (true);
create policy "Leitura pública para equipa autenticada - races" on public.races for select using (true);
create policy "Leitura pública para equipa autenticada - registrations" on public.race_registrations for select using (true);
create policy "Leitura pública para equipa autenticada - events" on public.team_events for select using (true);
create policy "Leitura pública para equipa autenticada - notifications" on public.notifications for select using (true);
