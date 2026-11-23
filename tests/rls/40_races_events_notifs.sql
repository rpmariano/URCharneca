-- 40: provas, eventos, comunicados, troféu e push. A = ...b1.

-- provas
select pg_temp.chk('A nao cria prova equipa', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-r1','x','equipa','2030-01-01','09:00','x','test-ath-a')$q$), 'ERR%');
select pg_temp.chk('A nao cria prova trofeu', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-r2','x','trofeu_cascais','2030-01-01','09:00','x','test-ath-a')$q$), 'ERR%');
select pg_temp.chk('A cria prova individual', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-r3','x','individual','2030-01-01','09:00','x','test-ath-a')$q$), 'OK 1');
select pg_temp.chk('A nao cria prova individual em nome de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1',
  $q$insert into public.races (id,title,category,date,start_time,location,created_by) values ('test-r4','x','individual','2030-01-01','09:00','x','test-ath-b')$q$), 'ERR%');
select pg_temp.chk('A edita a sua prova individual', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.races set title='novo' where id='test-race-ind-a'$q$), 'OK 1');
select pg_temp.chk('A nao edita prova individual de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.races set title='novo' where id='test-race-ind-b'$q$), 'OK 0');
select pg_temp.chk('A nao edita prova de equipa', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.races set title='novo' where id='test-race-team'$q$), 'OK 0');
select pg_temp.chk('A nao promove a sua prova a equipa', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.races set category='equipa' where id='test-race-ind-a'$q$), 'ERR%');
select pg_temp.chk('A nao passa a sua prova a B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.races set created_by='test-ath-b' where id='test-race-ind-a'$q$), 'ERR%');
select pg_temp.chk('A nao apaga prova de equipa', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.races where id='test-race-team'$q$), 'OK 0');
select pg_temp.chk('A nao apaga prova de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.races where id='test-race-ind-b'$q$), 'OK 0');
select pg_temp.chk('A apaga a sua prova individual', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.races where id='test-race-ind-a'$q$), 'OK 1');

-- team_events: so attendees
select pg_temp.chk('A altera attendees', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.team_events set attendees='["test-ath-a"]' where id='test-evt'$q$), 'OK 1');
select pg_temp.chk('A nao altera titulo do evento', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.team_events set title='x' where id='test-evt'$q$), 'ERR%');
select pg_temp.chk('A nao altera titulo+attendees', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.team_events set title='x', attendees='[]' where id='test-evt'$q$), 'ERR%');
select pg_temp.chk('A nao cria evento', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.team_events (id,title,type,date,time,location,created_by_name) values ('test-e2','x','training','2030-01-01','19:00','x','x')$q$), 'ERR%');
select pg_temp.chk('A nao apaga evento', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.team_events where id='test-evt'$q$), 'OK 0');

-- notifications: so read_by
select pg_temp.chk('A altera read_by', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.notifications set read_by='["test-ath-a"]' where id='test-notif'$q$), 'OK 1');
select pg_temp.chk('A nao altera titulo do aviso', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.notifications set title='x' where id='test-notif'$q$), 'ERR%');
select pg_temp.chk('A nao fixa avisos (pinned)', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.notifications set pinned=true where id='test-notif'$q$), 'ERR%');
select pg_temp.chk('A nao cria aviso', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.notifications (id,title,message,created_by_name,created_at) values ('test-n2','x','x','x','x')$q$), 'ERR%');
select pg_temp.chk('A nao apaga aviso', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.notifications where id='test-notif'$q$), 'OK 0');

-- troféu e push
select pg_temp.chk('A nao escreve trofeu_seasons', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.trofeu_seasons (season,edition_number,status,regulation_url,last_synced_at) values ('test',1,'open','x','x')$q$), 'ERR%');
select pg_temp.chk('A nao le trofeu_sync_logs', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000b1', 'select count(*) from public.trofeu_sync_logs'), '0');
select pg_temp.chk('A regista push propria', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.push_subscriptions (profile_id,endpoint,p256dh,auth) values ('test-ath-a','https://test.invalid/1','k','a')$q$), 'OK 1');
select pg_temp.chk('A nao regista push de B', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.push_subscriptions (profile_id,endpoint,p256dh,auth) values ('test-ath-b','https://test.invalid/2','k','a')$q$), 'ERR%');
