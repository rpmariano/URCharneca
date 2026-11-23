-- 20: escrita em profiles / youth_athletes por um atleta (A = ...b1).

-- A altera a propria ficha (campo livre) mas nao os campos reservados ao admin
select pg_temp.chk('A altera o proprio telefone', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set phone='900' where id='test-ath-a'$q$), 'OK 1');
select pg_temp.chk('A nao muda role',             pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set role='admin' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda login_authorized', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set login_authorized=false where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda login_email',      pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set login_email='z@test.invalid' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda email',            pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set email='z@test.invalid' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda auth_user_id',     pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set auth_user_id='00000000-0000-4000-8000-0000000000a1' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda dorsal_trofeu',    pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set dorsal_trofeu='1' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda dorsais_trofeu',   pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set dorsais_trofeu='{"2030":"1"}' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao muda o id',             pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set id='test-ath-z' where id='test-ath-a'$q$), 'ERR%');
select pg_temp.chk('A nao altera a ficha de B',   pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.profiles set phone='x' where id='test-ath-b'$q$), 'OK 0');
select pg_temp.chk('A nao cria fichas',           pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.profiles (id,name) values ('test-new','x')$q$), 'ERR%');
select pg_temp.chk('A nao apaga a propria ficha', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.profiles where id='test-ath-a'$q$), 'OK 0');
select pg_temp.chk('role de A inalterado (verificado como admin)', pg_temp.t_scalar('00000000-0000-4000-8000-0000000000a1', $q$select role from public.profiles where id='test-ath-a'$q$), 'athlete');

-- menores a cargo
select pg_temp.chk('A altera nota medica do menor a cargo', pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set medical_notes='n' where id='test-kid-a1'$q$), 'OK 1');
select pg_temp.chk('A nao muda associated_adult_ids',      pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set associated_adult_ids=array['test-ath-a','test-ath-b'] where id='test-kid-a1'$q$), 'ERR%');
select pg_temp.chk('A nao muda can_self_manage do menor',  pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set can_self_manage=true where id='test-kid-a1'$q$), 'ERR%');
select pg_temp.chk('A nao muda login_email do menor',      pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set login_email='k@test.invalid' where id='test-kid-a1'$q$), 'ERR%');
select pg_temp.chk('A nao muda dorsal do menor',           pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set dorsal_trofeu='9' where id='test-kid-a1'$q$), 'ERR%');
select pg_temp.chk('A nao altera menor de B',              pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$update public.youth_athletes set medical_notes='n' where id='test-kid-b1'$q$), 'OK 0');
select pg_temp.chk('A nao apaga menor',                    pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$delete from public.youth_athletes where id='test-kid-a1'$q$), 'OK 0');
select pg_temp.chk('A cria menor a cargo sem login',       pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.youth_athletes (id,name,associated_adult_ids) values ('test-kid-new','x',array['test-ath-a'])$q$), 'OK 1');
select pg_temp.chk('A nao cria menor com login proprio',   pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.youth_athletes (id,name,can_self_manage,associated_adult_ids) values ('test-kid-new2','x',true,array['test-ath-a'])$q$), 'ERR%');
select pg_temp.chk('A nao cria menor a cargo de B',        pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.youth_athletes (id,name,associated_adult_ids) values ('test-kid-new3','x',array['test-ath-b'])$q$), 'ERR%');
select pg_temp.chk('A nao cria menor sem se associar',     pg_temp.t_exec('00000000-0000-4000-8000-0000000000b1', $q$insert into public.youth_athletes (id,name,associated_adult_ids) values ('test-kid-new4','x','{}')$q$), 'ERR%');

-- jovem com login proprio
select pg_temp.chk('jovem altera a propria ficha', pg_temp.t_exec('00000000-0000-4000-8000-0000000000c1', $q$update public.youth_athletes set medical_notes='n' where id='test-teen'$q$), 'OK 1');
select pg_temp.chk('jovem nao muda can_self_manage', pg_temp.t_exec('00000000-0000-4000-8000-0000000000c1', $q$update public.youth_athletes set can_self_manage=false where id='test-teen'$q$), 'ERR%');
select pg_temp.chk('jovem nao muda auth_user_id',    pg_temp.t_exec('00000000-0000-4000-8000-0000000000c1', $q$update public.youth_athletes set auth_user_id='00000000-0000-4000-8000-0000000000a1' where id='test-teen'$q$), 'ERR%');
