-- 50: admin, signup bloqueado (auth.users) e claim_profile. Admin = ...a1.

-- admin faz tudo
select pg_temp.chk('admin is_admin true', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', 'select public.is_admin()'), 'true');
select pg_temp.chk('admin le todas as fichas', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select count(*) from public.profiles where id like 'test-%'$q$), '7');
select pg_temp.chk('admin le todos os menores', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select count(*) from public.youth_athletes where id like 'test-%'$q$), '4');
select pg_temp.chk('admin muda role', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$update public.profiles set role='admin', login_authorized=true, login_email='n@test.invalid', dorsal_trofeu='1' where id='test-ath-b'$q$), 'OK 1');
select pg_temp.chk('admin cria ficha', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$insert into public.profiles (id,name) values ('test-new','x')$q$), 'OK 1');
select pg_temp.chk('admin apaga ficha', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$delete from public.profiles where id='test-new'$q$), 'OK 1');
select pg_temp.chk('admin altera menor (adultos, dorsal)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$update public.youth_athletes set associated_adult_ids=array['test-ath-a','test-ath-b'], dorsal_trofeu='3' where id='test-kid-a1'$q$), 'OK 1');
select pg_temp.chk('admin confirma inscricao e dorsal', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$update public.race_registrations set status='enrolled_by_admin', bib_number='12', bib_status='at_club', result_time='00:40:00', trophy_points=5 where id='test-reg-b'$q$), 'OK 1');
select pg_temp.chk('admin cria inscricao para terceiros', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,status,bib_number) values ('test-na','test-race-team','test-ath-a','x','x','x','x','enrolled_by_admin','9')$q$), 'OK 1');
select pg_temp.chk('admin apaga inscricao', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$delete from public.race_registrations where id='test-na'$q$), 'OK 1');
select pg_temp.chk('admin cria/edita/apaga prova equipa', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$with i as (insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-ra','x','equipa','2030-01-01','09:00','x','test-admin') returning id), u as (update public.races set title='y' where id='test-race-trofeu' returning id) select 1$q$), 'OK 1');
select pg_temp.chk('admin apaga prova', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$delete from public.races where id='test-race-ind-b'$q$), 'OK 1');
select pg_temp.chk('admin cria/edita/apaga evento', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$with i as (insert into public.team_events (id,title,type,date,time,location,created_by_name) values ('test-e3','x','social','2030-01-01','19:00','x','x') returning id), u as (update public.team_events set title='y' where id='test-evt' returning id) delete from public.team_events where id='test-evt'$q$), 'OK 1');
select pg_temp.chk('admin cria/edita/apaga aviso', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$with i as (insert into public.notifications (id,title,message,created_by_name,created_at) values ('test-n3','x','x','x','x') returning id), u as (update public.notifications set title='y', pinned=true where id='test-notif' returning id) delete from public.notifications where id='test-notif'$q$), 'OK 1');
select pg_temp.chk('admin escreve trofeu_seasons', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$insert into public.trofeu_seasons (season,edition_number,status,regulation_url,last_synced_at) values ('test',1,'open','x','x')$q$), 'OK 1');
select pg_temp.chk('admin escreve/le trofeu_sync_logs', pg_temp.t_exec('00000000-0000-4000-8000-0000000000a1', $q$insert into public.trofeu_sync_logs (id,timestamp,trigger,summary) values ('test-l','x','manual_admin','x')$q$), 'OK 1');
select pg_temp.chk('admin le logs', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select count(*) from public.trofeu_sync_logs where id='test-l'$q$), '1');

-- signup (trigger block_uninvited_signup em auth.users); Maiusculas devem funcionar
select pg_temp.chk('signup nao autorizado e bloqueado', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'desconhecido@test.invalid')$q$), 'ERR%autorizado%');
select pg_temp.chk('signup de ficha NAO autorizada e bloqueado', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'claim-no@test.invalid')$q$), 'ERR%autorizado%');
select pg_temp.chk('signup de menor sem can_self_manage bloqueado', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'kid-sem-login@test.invalid')$q$), 'ERR%autorizado%');
select pg_temp.chk('signup de email autorizado (adulto) passa', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'claim-ok@test.invalid')$q$), 'OK');
select pg_temp.chk('signup e insensivel a maiusculas', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'A@TEST.INVALID')$q$), 'OK');
select pg_temp.chk('signup de jovem com login proprio passa', pg_temp.t_raw($q$insert into auth.users (id,email) values (gen_random_uuid(),'teen2@test.invalid')$q$), 'OK');

-- claim_profile: so liga emails autorizados e fichas livres
select pg_temp.chk('claim: email autorizado liga a ficha', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d1', 'select public.claim_profile()', 'Claim-OK@test.invalid'), 'test-claim-ok');
select pg_temp.chk('claim: auth_user_id gravado', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select auth_user_id::text from public.profiles where id='test-claim-ok'$q$), '00000000-0000-4000-8000-0000000000d1');
select pg_temp.chk('claim: outro utilizador nao rouba ficha ja ligada', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d2', 'select public.claim_profile()', 'claim-ok@test.invalid'), 'null');
select pg_temp.chk('claim: email nao autorizado nao liga', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d3', 'select public.claim_profile()', 'claim-no@test.invalid'), 'null');
select pg_temp.chk('claim: email desconhecido nao liga', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d4', 'select public.claim_profile()', 'ninguem@test.invalid'), 'null');
select pg_temp.chk('claim: ficha ocupada por outra conta nao liga', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d5', 'select public.claim_profile()', 'taken@test.invalid'), 'null');
select pg_temp.chk('claim: ficha nao autorizada continua sem conta', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select coalesce(auth_user_id::text,'none') from public.profiles where id='test-claim-no'$q$), 'none');
select pg_temp.chk('claim: jovem com login proprio liga', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d6', 'select public.claim_profile()', 'teen2@test.invalid'), 'test-teen2');
select pg_temp.chk('claim: menor sem login nao tem ficha reclamavel', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000d7', 'select public.claim_profile()', ''), 'null');
