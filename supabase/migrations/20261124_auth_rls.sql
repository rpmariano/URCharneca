-- Fase 2: autenticação (Supabase Auth) e políticas RLS por papel.
-- Convite = o admin autoriza o login e associa o email na ficha. Só esse email consegue criar conta.

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer para não dependerem das políticas)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = (select auth.uid()) and role = 'admin' and login_authorized
  );
$$;

-- Ids das pessoas que o utilizador autenticado representa: a própria ficha (adulto ou menor
-- com login próprio) e os menores de que é responsável.
create or replace function public.my_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = (select auth.uid()) and (login_authorized or role = 'admin')
  union
  select id from public.youth_athletes where auth_user_id = (select auth.uid()) and can_self_manage
  union
  select y.id from public.youth_athletes y
  join public.profiles p on p.id = any (y.associated_adult_ids)
  where p.auth_user_id = (select auth.uid()) and (p.login_authorized or p.role = 'admin');
$$;

create or replace function public.my_profile_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.profiles
  where auth_user_id = (select auth.uid()) and (login_authorized or role = 'admin') limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Convite: só emails autorizados pelo admin podem criar conta (Google ou email + palavra-passe)
-- ---------------------------------------------------------------------------
create or replace function public.block_uninvited_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles
    where lower(coalesce(login_email, email)) = lower(new.email) and (login_authorized or role = 'admin')
  ) and not exists (
    select 1 from public.youth_athletes
    where lower(coalesce(login_email, email)) = lower(new.email) and can_self_manage
  ) then
    raise exception 'Este email não foi autorizado pelo administrador.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists block_uninvited_signup on auth.users;
create trigger block_uninvited_signup before insert on auth.users
  for each row execute function public.block_uninvited_signup();

-- Liga a conta autenticada à ficha com o mesmo email (corre depois de cada início de sessão).
-- Com a confirmação de email ativa, só existe sessão para emails verificados.
create or replace function public.claim_profile() returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := (select auth.uid());
  mail text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  provider text := case when (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'google' then 'google' else 'email' end;
  pid text;
begin
  if uid is null or mail = '' then return null; end if;

  select id into pid from public.profiles
  where lower(coalesce(login_email, email)) = mail and (login_authorized or role = 'admin')
    and (auth_user_id is null or auth_user_id = uid)
  limit 1;
  if pid is not null then
    update public.profiles
    set auth_user_id = uid, login_provider = provider, login_activated_at = coalesce(login_activated_at, now())
    where id = pid;
    return pid;
  end if;

  select id into pid from public.youth_athletes
  where lower(coalesce(login_email, email)) = mail and can_self_manage
    and (auth_user_id is null or auth_user_id = uid)
  limit 1;
  if pid is not null then
    update public.youth_athletes
    set auth_user_id = uid, login_provider = provider, login_activated_at = coalesce(login_activated_at, now())
    where id = pid;
    return pid;
  end if;
  return null;
end $$;

revoke all on function public.claim_profile() from public, anon;
grant execute on function public.claim_profile() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_ids() to authenticated;
grant execute on function public.my_profile_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Vistas com dados não sensíveis (nome, escalão) para listas de equipa
-- ---------------------------------------------------------------------------
create or replace view public.team_directory as
  select id, name, nickname, gender, escalao, 'adult'::text as kind from public.profiles
  union all
  select id, name, '' as nickname, gender, escalao, 'youth'::text as kind from public.youth_athletes;
revoke all on public.team_directory from public, anon;
grant select on public.team_directory to authenticated;

-- ---------------------------------------------------------------------------
-- Guardas: o que um não-admin NÃO pode alterar
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then raise exception 'Só o administrador cria fichas.'; end if;
  if new.id is distinct from old.id or new.role is distinct from old.role
     or new.login_authorized is distinct from old.login_authorized
     or new.login_email is distinct from old.login_email
     or new.email is distinct from old.email
     or new.auth_user_id is distinct from old.auth_user_id
     or new.dorsal_trofeu is distinct from old.dorsal_trofeu
     or new.dorsais_trofeu is distinct from old.dorsais_trofeu then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before insert or update on public.profiles
  for each row execute function public.guard_profile();

create or replace function public.guard_youth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.auth_user_id is not null or new.can_self_manage
       or not (public.my_profile_id() = any (new.associated_adult_ids)) then
      raise exception 'Só podes criar menores a teu cargo, sem login próprio.';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id or new.auth_user_id is distinct from old.auth_user_id
     or new.can_self_manage is distinct from old.can_self_manage
     or new.login_email is distinct from old.login_email
     or new.associated_adult_ids is distinct from old.associated_adult_ids
     or new.dorsal_trofeu is distinct from old.dorsal_trofeu
     or new.dorsais_trofeu is distinct from old.dorsais_trofeu then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;
drop trigger if exists guard_youth on public.youth_athletes;
create trigger guard_youth before insert or update on public.youth_athletes
  for each row execute function public.guard_youth();

create or replace function public.guard_registration() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new.status = 'enrolled_by_admin' and (tg_op = 'INSERT' or old.status is distinct from 'enrolled_by_admin') then
    raise exception 'Só o administrador confirma inscrições.';
  end if;
  if tg_op = 'INSERT' then
    if new.bib_number is not null or new.bib_status <> 'pending' or new.result_time is not null or new.trophy_points is not null then
      raise exception 'Dorsais e resultados são geridos pelo administrador.';
    end if;
  elsif new.bib_number is distinct from old.bib_number or new.bib_status is distinct from old.bib_status
     or new.bib_pickup_by is distinct from old.bib_pickup_by or new.result_time is distinct from old.result_time
     or new.trophy_points is distinct from old.trophy_points or new.athlete_id is distinct from old.athlete_id
     or new.race_id is distinct from old.race_id then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;
drop trigger if exists guard_registration on public.race_registrations;
create trigger guard_registration before insert or update on public.race_registrations
  for each row execute function public.guard_registration();

-- Treinos e eventos: o atleta só pode alterar as presenças (attendees)
create or replace function public.guard_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op <> 'UPDATE' or (to_jsonb(new) - 'attendees') is distinct from (to_jsonb(old) - 'attendees') then
    raise exception 'Só o administrador altera eventos.';
  end if;
  return new;
end $$;
drop trigger if exists guard_event on public.team_events;
create trigger guard_event before insert or update on public.team_events
  for each row execute function public.guard_event();

-- Comunicados: o atleta só pode marcar como lido (read_by)
create or replace function public.guard_notification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op <> 'UPDATE' or (to_jsonb(new) - 'read_by') is distinct from (to_jsonb(old) - 'read_by') then
    raise exception 'Só o administrador altera comunicados.';
  end if;
  return new;
end $$;
drop trigger if exists guard_notification on public.notifications;
create trigger guard_notification before insert or update on public.notifications
  for each row execute function public.guard_notification();

-- ---------------------------------------------------------------------------
-- Permissões e políticas RLS (anon não tem acesso a nada)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke all on public.team_directory from anon;
grant select on public.team_directory to authenticated;

-- profiles: o próprio e o admin
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_admin() or id in (select public.my_ids()));
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin() or id in (select public.my_ids()))
  with check (public.is_admin() or id in (select public.my_ids()));
create policy profiles_insert on public.profiles for insert to authenticated with check (public.is_admin());
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- youth_athletes: admin, o próprio (login próprio) e os adultos responsáveis
create policy youth_select on public.youth_athletes for select to authenticated
  using (public.is_admin() or id in (select public.my_ids()));
create policy youth_update on public.youth_athletes for update to authenticated
  using (public.is_admin() or id in (select public.my_ids()))
  with check (public.is_admin() or id in (select public.my_ids()));
create policy youth_insert on public.youth_athletes for insert to authenticated
  with check (public.is_admin() or public.my_profile_id() = any (associated_adult_ids));
create policy youth_delete on public.youth_athletes for delete to authenticated using (public.is_admin());

-- races: todos leem; o admin escreve; o atleta gere as provas sugeridas por si
create policy races_select on public.races for select to authenticated using (true);
create policy races_insert on public.races for insert to authenticated
  with check (public.is_admin() or (category = 'individual' and created_by = public.my_profile_id()));
create policy races_update on public.races for update to authenticated
  using (public.is_admin() or (category = 'individual' and created_by = public.my_profile_id()))
  with check (public.is_admin() or (category = 'individual' and created_by = public.my_profile_id()));
create policy races_delete on public.races for delete to authenticated
  using (public.is_admin() or (category = 'individual' and created_by = public.my_profile_id()));

-- race_registrations: todos leem (listas "Quem vai"); cada um gere as suas e as dos menores a cargo
create policy regs_select on public.race_registrations for select to authenticated using (true);
create policy regs_insert on public.race_registrations for insert to authenticated
  with check (public.is_admin() or athlete_id in (select public.my_ids()) or dependent_id in (select public.my_ids()));
create policy regs_update on public.race_registrations for update to authenticated
  using (public.is_admin() or athlete_id in (select public.my_ids()) or dependent_id in (select public.my_ids()))
  with check (public.is_admin() or athlete_id in (select public.my_ids()) or dependent_id in (select public.my_ids()));
create policy regs_delete on public.race_registrations for delete to authenticated using (public.is_admin());

-- team_events, notifications: todos leem; o admin escreve; os atletas só presenças / leituras (ver guardas)
create policy events_select on public.team_events for select to authenticated using (true);
create policy events_insert on public.team_events for insert to authenticated with check (true);
create policy events_update on public.team_events for update to authenticated using (true) with check (true);
create policy events_delete on public.team_events for delete to authenticated using (public.is_admin());
create policy notifs_select on public.notifications for select to authenticated using (true);
create policy notifs_insert on public.notifications for insert to authenticated with check (true);
create policy notifs_update on public.notifications for update to authenticated using (true) with check (true);
create policy notifs_delete on public.notifications for delete to authenticated using (public.is_admin());

-- trofeu_*: todos leem; o admin escreve
create policy trofeu_seasons_select on public.trofeu_seasons for select to authenticated using (true);
create policy trofeu_seasons_write on public.trofeu_seasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy trofeu_logs_select on public.trofeu_sync_logs for select to authenticated using (public.is_admin());
create policy trofeu_logs_write on public.trofeu_sync_logs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- push_subscriptions: só as próprias
create policy push_own on public.push_subscriptions for all to authenticated
  using (profile_id in (select public.my_ids())) with check (profile_id in (select public.my_ids()));
