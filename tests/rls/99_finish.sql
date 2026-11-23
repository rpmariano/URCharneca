-- 99_finish.sql: resume os resultados e REVERTE tudo.
-- A excecao final aborta a transacao (nada persiste); o relatorio vai na mensagem de erro.
create or replace function pg_temp.finish() returns void language plpgsql as $$
declare rep text;
begin
  select 'PASS=' || count(*) filter (where ok) || ' FAIL=' || count(*) filter (where not ok)
    || E'\nFALHAS:\n' || coalesce(string_agg('  FAIL ' || name || ' | obtido: ' || left(actual, 120) || ' | esperado: ' || expected, E'\n') filter (where not ok), '  (nenhuma)')
    || E'\nPASSAM:\n' || coalesce(string_agg(name, E'\n') filter (where ok), '')
  into rep from t_res;
  raise exception E'RLS_TEST_REPORT (rollback)\n%', rep;
end $$;
select pg_temp.finish();
