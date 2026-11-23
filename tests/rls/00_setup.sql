-- 00_setup.sql: ajudantes e dados FICTICIOS (ids test-*, emails @test.invalid).
-- Tudo vive numa unica transacao implicita que 99_finish.sql reverte com uma excecao.
-- NUNCA correr estes ficheiros separadamente: concatenar (ver README.md).

create temp table t_res (n serial, name text, actual text, expected text, ok boolean);

-- Executa SQL como um utilizador simulado. p_uid null = anon.
-- Devolve 'OK <linhas afetadas>' ou 'ERR <mensagem>' (RLS que filtra devolve OK 0).
create or replace function pg_temp.t_exec(p_uid uuid, p_sql text, p_email text default 'x@test.invalid')
returns text language plpgsql as $$
declare n bigint; v text;
begin
  if p_uid is null then execute 'set local role anon';
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text, true);
  end if;
  begin
    execute p_sql;
    get diagnostics n = row_count;
    v := 'OK ' || n;
  exception when others then v := 'ERR ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

-- Como t_exec, mas devolve o valor da primeira coluna da primeira linha (ou 'ERR ...').
create or replace function pg_temp.t_scalar(p_uid uuid, p_sql text, p_email text default 'x@test.invalid')
returns text language plpgsql as $$
declare v text;
begin
  if p_uid is null then execute 'set local role anon';
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text, true);
  end if;
  begin
    execute p_sql into v;
    v := coalesce(v, 'null');
  exception when others then v := 'ERR ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

-- Executa SQL com o papel da ligacao (postgres), p.ex. para o trigger em auth.users
-- (o signup real corre como supabase_auth_admin; o que se testa e a logica do trigger).
create or replace function pg_temp.t_raw(p_sql text)
returns text language plpgsql as $$
begin
  begin execute p_sql; return 'OK';
  exception when others then return 'ERR ' || sqlerrm;
  end;
end $$;

-- Regista um caso: PASS se actual LIKE expected.
create or replace function pg_temp.chk(p_name text, p_actual text, p_expected text)
returns void language sql as $$
  insert into t_res(name, actual, expected, ok) values (p_name, p_actual, p_expected, p_actual like p_expected);
$$;

-- Fixtures (como postgres, sem guardas: sao o que se quer testar depois).
set local session_replication_role = replica;

insert into public.profiles (id, name, role, login_authorized, login_email, auth_user_id, phone) values
 ('test-admin', 'Teste Admin',  'admin',   true,  'admin@test.invalid', '00000000-0000-4000-8000-0000000000a1', ''),
 ('test-ath-a', 'Teste Atleta A','athlete', true,  'a@test.invalid',     '00000000-0000-4000-8000-0000000000b1', ''),
 ('test-ath-b', 'Teste Atleta B','athlete', true,  'b@test.invalid',     '00000000-0000-4000-8000-0000000000b2', ''),
 ('test-ath-c', 'Teste Revogado','athlete', false, 'c@test.invalid',     '00000000-0000-4000-8000-0000000000b3', ''),
 ('test-claim-ok',    'Teste Claim OK',   'athlete', true,  'claim-ok@test.invalid', null, ''),
 ('test-claim-no',    'Teste Claim Nao',  'athlete', false, 'claim-no@test.invalid', null, ''),
 ('test-claim-taken', 'Teste Claim Ocupado','athlete', true,'taken@test.invalid', '00000000-0000-4000-8000-0000000000f9', '');

insert into public.youth_athletes (id, name, can_self_manage, login_email, auth_user_id, associated_adult_ids) values
 ('test-kid-a1', 'Teste Menor A1', false, null, null, array['test-ath-a']),
 ('test-kid-b1', 'Teste Menor B1', false, null, null, array['test-ath-b']),
 ('test-teen',   'Teste Jovem',    true, 'teen@test.invalid',  '00000000-0000-4000-8000-0000000000c1', '{}'),
 ('test-teen2',  'Teste Jovem 2',  true, 'teen2@test.invalid', null, '{}');

insert into public.races (id, title, category, date, start_time, location, created_by) values
 ('test-race-team',   'Prova equipa',    'equipa',          '2030-01-01', '09:00', 'Teste', 'test-admin'),
 ('test-race-trofeu', 'Prova trofeu',    'trofeu_cascais',  '2030-01-02', '09:00', 'Teste', 'test-admin'),
 ('test-race-ind-a',  'Prova ind A',     'individual',      '2030-01-03', '09:00', 'Teste', 'test-ath-a'),
 ('test-race-ind-b',  'Prova ind B',     'individual',      '2030-01-04', '09:00', 'Teste', 'test-ath-b');

insert into public.race_registrations (id, race_id, athlete_id, athlete_name, escalao, distance, status, created_at) values
 ('test-reg-a',   'test-race-team', 'test-ath-a', 'Teste Atleta A', 'Seniores M', '10 km', 'interested',        '2030-01-01'),
 ('test-reg-b',   'test-race-team', 'test-ath-b', 'Teste Atleta B', 'Seniores M', '10 km', 'interested',        '2030-01-01'),
 ('test-reg-adm', 'test-race-team', 'test-ath-b', 'Teste Atleta B', 'Seniores M', '5 km',  'enrolled_by_admin', '2030-01-01');
insert into public.race_registrations (id, race_id, athlete_id, dependent_id, is_dependent, athlete_name, escalao, distance, created_at) values
 ('test-reg-kid-a1', 'test-race-team', 'test-kid-a1', 'test-kid-a1', true, 'Teste Menor A1', 'Benjamins', '1 km', '2030-01-01');

insert into public.team_events (id, title, type, date, time, location, created_by_name) values
 ('test-evt', 'Treino teste', 'training', '2030-01-01', '19:00', 'Teste', 'Teste');
insert into public.notifications (id, title, message, created_by_name, created_at) values
 ('test-notif', 'Aviso teste', 'msg', 'Teste', '2030-01-01');

set local session_replication_role = origin;  -- as guardas (triggers) voltam a disparar
