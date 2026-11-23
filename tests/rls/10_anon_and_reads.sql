-- 10: anon sem acesso; leitura de fichas por atleta / jovem / revogado / sem ficha.
-- UUIDs: ...a1 admin, ...b1 atleta A, ...b2 atleta B, ...b3 revogado, ...c1 jovem com login, ...e1 sem ficha.

-- anon: nenhuma tabela legivel, nem a vista team_directory
select pg_temp.chk('anon SELECT ' || t, pg_temp.t_scalar(null, 'select count(*) from public.' || t), 'ERR%')
from unnest(array['profiles','youth_athletes','races','race_registrations','team_events','notifications',
                  'trofeu_seasons','trofeu_sync_logs','push_subscriptions','team_directory']) t;
select pg_temp.chk('anon INSERT race_registrations',
  pg_temp.t_exec(null, $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at) values ('test-x','test-race-team','test-ath-a','x','x','x','x')$q$), 'ERR%');
select pg_temp.chk('anon UPDATE profiles', pg_temp.t_exec(null, $q$update public.profiles set role='admin' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('anon rpc claim_profile', pg_temp.t_scalar(null, 'select public.claim_profile()'), 'ERR%');

-- atleta A
select pg_temp.chk('A le a sua ficha', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.profiles where id='test-ath-a'$q$), '1');
select pg_temp.chk('A so ve 1 ficha de adulto', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.profiles where id like 'test-%'$q$), '1');
select pg_temp.chk('A nao le a ficha de B', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.profiles where id='test-ath-b'$q$), '0');
select pg_temp.chk('A le o menor a cargo', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.youth_athletes where id='test-kid-a1'$q$), '1');
select pg_temp.chk('A so ve o seu menor', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.youth_athletes where id like 'test-%'$q$), '1');
select pg_temp.chk('A is_admin = false', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', 'select public.is_admin()'), 'false');
select pg_temp.chk('A my_ids = ficha + menor', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.my_ids() i where i like 'test-%'$q$), '2');
-- team_directory e deliberadamente legivel por todos os autenticados (so nome/escalao)
select pg_temp.chk('A ve team_directory (desenho: todos)', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.team_directory where id like 'test-%'$q$), '11');
select pg_temp.chk('team_directory sem colunas sensiveis',
  (select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='team_directory'),
  'escalao,gender,id,kind,name,nickname');

-- jovem com login proprio
select pg_temp.chk('jovem le a sua ficha', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000c1', $q$select count(*) from public.youth_athletes where id like 'test-%'$q$), '1');
select pg_temp.chk('jovem nao le fichas de adultos', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000c1', $q$select count(*) from public.profiles where id like 'test-%'$q$), '0');

-- login revogado e utilizador sem ficha (um menor sem login nunca tem conta: auth_user_id e null)
select pg_temp.chk('revogado nao le fichas', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b3', $q$select count(*) from public.profiles where id like 'test-%'$q$), '0');
select pg_temp.chk('revogado is_admin false', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b3', 'select public.is_admin()'), 'false');
select pg_temp.chk('sem ficha nao le profiles', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000e1', $q$select count(*) from public.profiles where id like 'test-%'$q$), '0');
select pg_temp.chk('sem ficha nao le menores', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000e1', $q$select count(*) from public.youth_athletes where id like 'test-%'$q$), '0');
select pg_temp.chk('sem ficha nao inscreve menor',
  pg_temp.t_exec('00000000-0000-4000-8000-0000000000e1', $q$insert into public.race_registrations (id,race_id,athlete_id,dependent_id,is_dependent,athlete_name,escalao,distance,created_at) values ('test-x','test-race-team','test-kid-a1','test-kid-a1',true,'x','x','x','x')$q$), 'ERR%');
select pg_temp.chk('sem ficha nao altera menor', pg_temp.t_exec('00000000-0000-4000-8000-0000000000e1', $q$update public.youth_athletes set name='hack' where id='test-kid-a1'$q$), 'OK 0');
select pg_temp.chk('sem ficha nao cria prova', pg_temp.t_exec('00000000-0000-4000-8000-0000000000e1', $q$insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-x','x','individual','2030-01-01','09:00','x','test-ath-a')$q$), 'ERR%');
