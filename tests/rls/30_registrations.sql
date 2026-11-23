-- 30: inscricoes em provas (race_registrations). A = ...b1 (menor a cargo: test-kid-a1), B = ...b2.
-- Colunas obrigatorias abreviadas: race_id, athlete_id, athlete_name, escalao, distance, created_at.

-- criar
select pg_temp.chk('A cria inscricao propria', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,status) values ('test-n1','test-race-team','test-ath-a','x','x','x','x','self_enrolled')$q$), 'OK 1');
select pg_temp.chk('A cria inscricao do menor a cargo', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,dependent_id,is_dependent,athlete_name,escalao,distance,created_at) values ('test-n2','test-race-trofeu','test-kid-a1','test-kid-a1',true,'x','x','x','x')$q$), 'OK 1');
select pg_temp.chk('A cria inscricao do menor (athlete_id=A, dependent_id=menor)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,dependent_id,is_dependent,athlete_name,escalao,distance,created_at) values ('test-n2b','test-race-ind-a','test-ath-a','test-kid-a1',true,'x','x','x','x')$q$), 'OK 1');
select pg_temp.chk('A nao cria inscricao de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at) values ('test-n3','test-race-trofeu','test-ath-b','x','x','x','x')$q$), 'ERR%');
select pg_temp.chk('A nao cria inscricao do menor de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,dependent_id,is_dependent,athlete_name,escalao,distance,created_at) values ('test-n4','test-race-trofeu','test-kid-b1','test-kid-b1',true,'x','x','x','x')$q$), 'ERR%');
-- tentativa de contornar: athlete_id de terceiro com dependent_id proprio
select pg_temp.chk('A nao cria inscricao de B via dependent_id=A', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,dependent_id,athlete_name,escalao,distance,created_at) values ('test-n5','test-race-ind-b','test-ath-b','test-ath-a','x','x','x','x')$q$), 'ERR%');
select pg_temp.chk('A nao confirma inscricao (enrolled_by_admin)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,status) values ('test-n6','test-race-ind-a','test-ath-a','x','x','x','x','enrolled_by_admin')$q$), 'ERR%');
select pg_temp.chk('A nao escreve bib_number', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,bib_number) values ('test-n7','test-race-ind-a','test-ath-a','x','x','x','x','77')$q$), 'ERR%');
select pg_temp.chk('A nao escreve bib_status', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,bib_status) values ('test-n8','test-race-ind-a','test-ath-a','x','x','x','x','delivered')$q$), 'ERR%');
select pg_temp.chk('A nao escreve result_time', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,result_time) values ('test-n9','test-race-ind-a','test-ath-a','x','x','x','x','00:30:00')$q$), 'ERR%');
select pg_temp.chk('A nao escreve trophy_points', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.race_registrations (id,race_id,athlete_id,athlete_name,escalao,distance,created_at,trophy_points) values ('test-n10','test-race-ind-a','test-ath-a','x','x','x','x',99)$q$), 'ERR%');

-- atualizar / cancelar
select pg_temp.chk('A cancela inscricao propria', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set status='cancelled' where id='test-reg-a'$q$), 'OK 1');
select pg_temp.chk('A cancela inscricao do menor a cargo', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set status='cancelled' where id='test-reg-kid-a1'$q$), 'OK 1');
select pg_temp.chk('A nao cancela inscricao de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set status='cancelled' where id='test-reg-b'$q$), 'OK 0');
select pg_temp.chk('A nao se auto-confirma', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set status='enrolled_by_admin' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao escreve bib_number (update)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set bib_number='5' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao escreve bib_status (update)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set bib_status='delivered' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao escreve bib_pickup_by (update)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set bib_pickup_by='x' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao escreve result_time (update)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set result_time='1' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda athlete_id', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set athlete_id='test-ath-b' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda race_id', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.race_registrations set race_id='test-race-trofeu' where id='test-reg-a'$q$), 'ERR%');
select pg_temp.chk('A nao apaga inscricoes', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.race_registrations where id='test-reg-a'$q$), 'OK 0');
-- estado: inscricao de B nao foi tocada
select pg_temp.chk('inscricao de B intacta', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select status from public.race_registrations where id='test-reg-b'$q$), 'interested');
-- leitura: todas as inscricoes sao legiveis por autenticados (listas "Quem vai"), por desenho
select pg_temp.chk('A le inscricoes de todos (desenho)', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', $q$select count(*) from public.race_registrations where id like 'test-reg%'$q$), '4');
