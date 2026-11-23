# trofeu-sync

Edge Function (Deno) que lê as classificações oficiais de <https://trofeuatletismocascais.pt> e atualiza a tabela `trofeu_seasons` (`athlete_standings`, `club_standings`, `last_synced_at`) da época em curso, para a U.R. Charneca (atletas) e para todos os clubes (coletiva).

- `index.ts`: handler (autenticação, base de dados, pedidos ao site).
- `parse.ts`: parser e cálculos puros, sem imports Deno (testados em Node: `tests/unit/trofeuParse.test.ts`).

## Deploy

```
supabase functions deploy trofeu-sync --project-ref iflwqojmcrazprehzzpb
```

Variáveis (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`) são injetadas pelo Supabase no ambiente da function; não é preciso defini-las nem as guardar no repositório. Opcional: `ALLOWED_ORIGINS` (lista separada por vírgulas) para acrescentar origens CORS além de `https://rpmariano.github.io` e `http://localhost:5173/4173`.

## Pedido

`POST /functions/v1/trofeu-sync` com `Authorization: Bearer <jwt do administrador>` (e `apikey` habitual do supabase-js). A function valida o JWT com a RPC `is_admin()`; só depois usa a service role para escrever.

Corpo JSON (tudo opcional):

| campo | descrição |
| --- | --- |
| `season` | época a sincronizar (por omissão a época `open` mais recente) |
| `dry_run` | `true` calcula e responde sem gravar nada |
| `scan_ahead` | nº de ids a procurar a seguir ao último id conhecido (omissão 80, máx. 200) |

Exemplo no cliente: `supabase.functions.invoke('trofeu-sync', { body: {} })`.

## Resposta

```json
{
  "ok": true,
  "season": "2026/2027",
  "dry_run": false,
  "stages": [{ "stage": "P1", "competition_id": 920, "date": "2026-11-22", "urc_athletes": 47 }],
  "athletes_updated": 47,
  "clubs_updated": 24,
  "discovered_ids": [{ "stage": "P2", "competition_id": 931 }],
  "unmatched": [{ "dorsal": "123", "name": "Nome Apelido" }],
  "warnings": [],
  "message": "Sincronização concluída: ..."
}
```

Erros: `{ "ok": false, "message": "..." }` com 400 (corpo inválido), 401 (sem sessão), 403 (não é admin / origem não autorizada), 404 (época inexistente), 405, 409 (o site deixou de mostrar etapas já gravadas; nada é alterado), 502 (falha ao ler o site; nada é gravado), 500.

## Como funciona

1. Provas da época: `races` com `category = 'trofeu_cascais'` dentro da época (1 ago a 31 jul). Só entram as já realizadas (data de hoje em Lisboa ou anterior).
2. Ids em falta (`races.trofeu_competition_id`): procura em `/Competicoes/<id>` os ids a seguir ao maior id conhecido (6 em paralelo, para quando todas as datas em falta estiverem encontradas) e associa por DATA. Grava o id descoberto em `races`. Se houver várias competições na mesma data, desempata pelo título; se continuar ambíguo, não associa e avisa.
3. Para cada prova com id lê `/Classificacao/<id>/1` (individual) e `/Coletiva/<id>/1` (clubes).
4. Individual: pontos por dorsal somados por prova; classificação acumulada por escalão/género (todos os clubes) com desempate por mais provas, mais 1.ºs, 2.ºs e 3.ºs lugares (empate total partilha o lugar). Guarda só os atletas da U.R. Charneca, com `stage_results` (`pos`, `points`, `time`, `competition_id`, `race_id` por etapa). Ficha por dorsal da época (`dorsais_trofeu[época]`) e, se não houver, por nome normalizado único; sem ficha, `birth_year = 0` e o atleta aparece em `unmatched`.
5. Clubes: soma, por clube, dos totais da coletiva de cada prova (igual à soma dos pontos individuais; a function avisa se o total da U.R. Charneca divergir).
6. Tudo é lido e calculado antes de gravar: se o site falhar, não se grava nada. É idempotente.

## Limites

- Descoberta de ids: só procura `scan_ahead` ids a seguir ao maior id conhecido; se o site saltar mais do que isso, indicar o id à mão em `races.trofeu_competition_id`. Uma competição de outra prova na mesma data pode ser associada por engano (desempate só pelo título).
- Não atualiza `trofeu_seasons.stages` (flags `completed`) nem `trofeu_sync_logs`.
- O site não tem API: depende da estrutura HTML atual (tabelas com colunas Pos, Dorsal, Nome, Clube, Pontos; `nome_bloco_*` com o género).
