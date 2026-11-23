-- PROPOSTA (não aplicada): ordem justa dos pedidos de lugar na carrinha.
--
-- Problema: a fila da carrinha ordena por `van_requested_at`, que hoje é escrito pelo telemóvel de cada atleta
-- (relógio do cliente, manipulável e dessincronizado). Dois pedidos quase simultâneos ao último lugar podem
-- ficar na ordem errada.
--
-- Solução pequena: o servidor passa a decidir `van_requested_at` (relógio único) e há uma função só de leitura
-- para devolver a posição na fila. A inscrição continua a ser um insert normal (as políticas RLS não mudam),
-- por isso não é preciso uma RPC de escrita nem alterar a app: a app já guarda a linha devolvida pelo servidor.

-- ---------------------------------------------------------------------------
-- 1. Hora do pedido definida pelo servidor
-- ---------------------------------------------------------------------------
create or replace function public.set_van_requested_at() returns trigger
language plpgsql set search_path = public as $$
declare
  van_modes constant text[] := array['van_roundtrip', 'van_return_only'];
  stamp text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if not (new.transport_mode = any (van_modes)) then
    new.van_requested_at := null;               -- deixou de querer carrinha: sai da fila
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- um admin pode inscrever com uma hora indicada (ex.: pedidos recebidos por mensagem)
    if not (public.is_admin() and new.van_requested_at is not null) then
      new.van_requested_at := stamp;
    end if;
  elsif not (old.transport_mode = any (van_modes)) then
    new.van_requested_at := stamp;              -- passou agora para a carrinha
  elsif not public.is_admin() then
    new.van_requested_at := old.van_requested_at; -- manter a vez já conquistada (ex.: mudar de ida/volta para só regresso)
  end if;
  return new;
end $$;

drop trigger if exists set_van_requested_at on public.race_registrations;
create trigger set_van_requested_at before insert or update on public.race_registrations
  for each row execute function public.set_van_requested_at();

-- ---------------------------------------------------------------------------
-- 2. Posição na fila (só leitura). Mesma regra da app: ordem por pedido, lugares = soma dos veículos.
--    Nota: a app também tem em conta o veículo escolhido; aqui conta-se só a ordem global (aproximação
--    suficiente para dizer "lugar confirmado" ou "lista de espera"; o ecrã da prova continua a ser a referência).
-- ---------------------------------------------------------------------------
create or replace function public.van_position(p_reg_id text)
returns table (queue_position integer, capacity integer, status text)
language sql stable security definer set search_path = public as $$
  with target as (
    select r.id, r.race_id from public.race_registrations r where r.id = p_reg_id
  ),
  seats as (
    select t.race_id,
           coalesce(
             nullif((select sum((v ->> 'seats')::int) from jsonb_array_elements(coalesce(ra.vehicles, '[]'::jsonb)) v), 0),
             ra.van_capacity,
             0
           ) as capacity
    from target t join public.races ra on ra.id = t.race_id
  ),
  queue as (
    select r.id,
           row_number() over (order by coalesce(r.van_requested_at, r.created_at), r.created_at, r.id) as pos
    from public.race_registrations r
    join target t on t.race_id = r.race_id
    where r.status <> 'cancelled' and r.transport_mode in ('van_roundtrip', 'van_return_only')
  )
  select q.pos::int, s.capacity::int, case when q.pos <= s.capacity then 'confirmed' else 'waitlist' end
  from queue q join target t on t.id = q.id join seats s on s.race_id = t.race_id;
$$;

revoke all on function public.van_position(text) from public, anon;
grant execute on function public.van_position(text) to authenticated;
