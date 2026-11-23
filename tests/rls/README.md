# Testes RLS

Suite SQL que verifica a matriz de permissões (anon, atleta, jovem com login, login revogado,
utilizador sem ficha, admin, signup, `claim_profile`) com **dados fictícios** (`test-*`, `@test.invalid`).

## Como correr
Concatenar os ficheiros por ordem e executar num único pedido (SQL Editor do Supabase, `psql -f`,
ou a ferramenta `execute_sql` do MCP):

    cat tests/rls/*.sql > /tmp/rls-all.sql

- Tudo corre numa transação implícita. `99_finish.sql` termina com uma **exceção** que reverte tudo:
  o relatório (PASS/FAIL) vem na mensagem de erro `RLS_TEST_REPORT (rollback)`. Nada persiste.
- Se o script falhar a meio, a transação também é abortada. **Nunca remover o `99_finish.sql`.**
- Os fixtures são inseridos com `session_replication_role = replica` (sem guardas) e depois repostos a `origin`.
- Para testar uma migração proposta, colá-la entre `00_setup.sql` e `10_*.sql` (DDL também reverte).
- Preferir correr contra um projeto de teste; em produção só é seguro por causa do rollback final.

## Ficheiros
`00_setup` ajudantes + fixtures · `10` anon/leituras · `20` fichas e menores · `30` inscrições ·
`40` provas/eventos/avisos/push · `50` admin, signup, claim · `99` relatório + rollback.
