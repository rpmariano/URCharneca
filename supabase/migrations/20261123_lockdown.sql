-- Contenção: fecha o acesso público e remove os hashes de palavras-passe.
-- Correr no painel do Supabase (SQL Editor) do projeto URCharneca.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.profiles drop column if exists login_password_hash;
alter table public.youth_athletes drop column if exists login_password_hash;

-- RLS fica ativa e sem políticas: anon e authenticated deixam de ler/escrever.
alter table public.profiles enable row level security;
alter table public.youth_athletes enable row level security;
alter table public.races enable row level security;
alter table public.race_registrations enable row level security;
alter table public.team_events enable row level security;
alter table public.notifications enable row level security;
alter table public.trofeu_seasons enable row level security;
alter table public.trofeu_sync_logs enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on all tables in schema public from anon;
