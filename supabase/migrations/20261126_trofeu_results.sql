-- Classificações completas do Troféu (todos os clubes), gravadas pela Edge Function trofeu-sync.
-- Dados publicados pelo organizador em trofeuatletismocascais.pt. Por minimização, NÃO se guarda
-- dorsal nem ano de nascimento: só lugar, nome, clube, escalão, género, marca e pontos.
-- Leitura: só membros da equipa com sessão (ficha ligada) e administradores. Escrita: só a service role.

-- Uma linha por etapa: classificação individual completa e coletiva (clubes) dessa prova.
create table if not exists public.trofeu_stage_results (
  season text not null,
  stage text not null,                 -- 'P1', 'P2', ...
  race_id text,
  competition_id integer,
  athletes jsonb not null default '[]', -- [{pos,name,club,escalao,gender,time,points,urc}]
  clubs jsonb not null default '[]',    -- [{pos,sigla,name,athletes,points,urc}]
  synced_at timestamptz not null default now(),
  primary key (season, stage)
);

-- Uma linha por época: classificação geral individual acumulada, de todos os clubes.
create table if not exists public.trofeu_general_standings (
  season text primary key,
  athletes jsonb not null default '[]', -- [{pos,name,club,escalao,gender,total,stages,pts:{P1:n},urc}]
  synced_at timestamptz not null default now()
);

alter table public.trofeu_stage_results enable row level security;
alter table public.trofeu_general_standings enable row level security;

revoke all on public.trofeu_stage_results from anon, authenticated;
revoke all on public.trofeu_general_standings from anon, authenticated;
grant select on public.trofeu_stage_results to authenticated;
grant select on public.trofeu_general_standings to authenticated;

drop policy if exists trofeu_stage_results_select on public.trofeu_stage_results;
create policy trofeu_stage_results_select on public.trofeu_stage_results for select to authenticated
  using (public.is_admin() or exists (select 1 from public.my_ids()));

drop policy if exists trofeu_general_select on public.trofeu_general_standings;
create policy trofeu_general_select on public.trofeu_general_standings for select to authenticated
  using (public.is_admin() or exists (select 1 from public.my_ids()));
