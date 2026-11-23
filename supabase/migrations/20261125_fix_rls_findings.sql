-- PROPOSTA (nao aplicada): correcoes encontradas por tests/rls.
-- Verificada em transacao com ROLLBACK (tests/rls passa 100% com este ficheiro aplicado antes).

-- 1) BURACO: um atleta podia criar/cancelar inscricoes de TERCEIROS.
--    A politica aceitava "athlete_id meu OU dependent_id meu", logo bastava
--    athlete_id = <outra pessoa>, dependent_id = <o meu id>.
--    O app usa sempre athlete_id = quem inscreve (adulto ou menor com login) e
--    dependent_id = menor a cargo (ou o proprio menor com login).
drop policy if exists regs_insert on public.race_registrations;
drop policy if exists regs_update on public.race_registrations;
create policy regs_insert on public.race_registrations for insert to authenticated
  with check (public.is_admin()
    or (athlete_id in (select public.my_ids()) and (dependent_id is null or dependent_id in (select public.my_ids()))));
create policy regs_update on public.race_registrations for update to authenticated
  using (public.is_admin() or athlete_id in (select public.my_ids()))
  with check (public.is_admin()
    or (athlete_id in (select public.my_ids()) and (dependent_id is null or dependent_id in (select public.my_ids()))));

-- 2) BUG FUNCIONAL: claim_profile() falhava para o proprio utilizador ("Alteracao reservada ao
--    administrador"), porque as guardas de profiles/youth_athletes bloqueiam auth_user_id a nao-admins.
--    Resultado: ninguem conseguia ligar a conta a ficha no primeiro login.
--    Solucao: claim_profile marca a transacao (app.claiming) so durante os seus UPDATEs;
--    as guardas deixam passar apenas essa janela. Clientes PostgREST nao conseguem definir esta variavel.
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
    perform set_config('app.claiming', 'on', true);
    update public.profiles
    set auth_user_id = uid, login_provider = provider, login_activated_at = coalesce(login_activated_at, now())
    where id = pid;
    perform set_config('app.claiming', 'off', true);
    return pid;
  end if;

  select id into pid from public.youth_athletes
  where lower(coalesce(login_email, email)) = mail and can_self_manage
    and (auth_user_id is null or auth_user_id = uid)
  limit 1;
  if pid is not null then
    perform set_config('app.claiming', 'on', true);
    update public.youth_athletes
    set auth_user_id = uid, login_provider = provider, login_activated_at = coalesce(login_activated_at, now())
    where id = pid;
    perform set_config('app.claiming', 'off', true);
    return pid;
  end if;
  return null;
end $$;

create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.claiming', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then raise exception 'Só o administrador cria fichas.'; end if;
  if new.id is distinct from old.id or new.role is distinct from old.role
     or new.login_authorized is distinct from old.login_authorized
     or new.login_email is distinct from old.login_email
     or new.email is distinct from old.email
     or new.auth_user_id is distinct from old.auth_user_id
     or new.login_provider is distinct from old.login_provider
     or new.login_activated_at is distinct from old.login_activated_at
     or new.dorsal_trofeu is distinct from old.dorsal_trofeu
     or new.dorsais_trofeu is distinct from old.dorsais_trofeu then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;

create or replace function public.guard_youth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.claiming', true) = 'on' then return new; end if;
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
     or new.login_provider is distinct from old.login_provider
     or new.login_activated_at is distinct from old.login_activated_at
     or new.associated_adult_ids is distinct from old.associated_adult_ids
     or new.dorsal_trofeu is distinct from old.dorsal_trofeu
     or new.dorsais_trofeu is distinct from old.dorsais_trofeu then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;

-- 3) Endurecimento: dependent_id nao pode ser reatribuido por um atleta.
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
     or new.dependent_id is distinct from old.dependent_id or new.race_id is distinct from old.race_id then
    raise exception 'Alteração reservada ao administrador.';
  end if;
  return new;
end $$;

-- 4) Advisors de seguranca: funcoes SECURITY DEFINER nao devem ser chamaveis via /rest/v1/rpc.
--    As guardas e o trigger de signup so correm como triggers (nao precisam de EXECUTE do chamador).
--    is_admin/my_ids/my_profile_id/claim_profile ficam so para authenticated (as politicas RLS precisam).
revoke execute on function public.block_uninvited_signup() from public, anon, authenticated;
revoke execute on function public.guard_event() from public, anon, authenticated;
revoke execute on function public.guard_notification() from public, anon, authenticated;
revoke execute on function public.guard_profile() from public, anon, authenticated;
revoke execute on function public.guard_registration() from public, anon, authenticated;
revoke execute on function public.guard_youth() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.my_ids() from public, anon;
revoke execute on function public.my_profile_id() from public, anon;
revoke execute on function public.claim_profile() from public, anon;
-- Nota: o aviso "security_definer_view" de public.team_directory e INTENCIONAL (expoe so nome/escalao
-- a toda a equipa sem abrir profiles/youth_athletes). Nao mudar para security_invoker.
