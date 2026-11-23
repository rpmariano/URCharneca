# Camada de dados

## Modos
- **Configurado** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`): a fonte de verdade é o Supabase. O `localStorage` guarda só preferências (tema, papel ativo, onboarding) e uma cache de arranque (`urc_cache_v8`) que é apagada ao terminar ou expirar a sessão.
- **Demonstração** (sem variáveis): tudo em `localStorage` com os dados de exemplo, como antes.

## Gravações
Cada operação do `AppContext` aplica o estado local de imediato e grava pelo `persist()`:
1. As gravações correm **em série** (por exemplo, a prova é criada antes da inscrição que a referencia).
2. Se o servidor recusar (RLS, guarda, rede), o estado local é **revertido** e aparece um aviso: "Sem permissão para esta ação.", "Sem ligação. Não foi possível guardar." ou "Não foi possível guardar.".
3. Um update/delete que o RLS filtra em silêncio (0 linhas) conta como falta de permissão.
4. 401 / JWT expirado: termina a sessão, apaga dados e cache e volta ao login com o aviso "A tua sessão expirou. Entra de novo.".

Criar usa `insert` e alterar usa `update` (nunca `upsert` para não-admins: o INSERT de um upsert dispara as guardas de criação mesmo para linhas existentes). Um não-admin nunca envia campos reservados ao admin (papel, emails de login, dorsais, estado de bib, etc.).

## O que muda para atletas (modo configurado)
- Só recebem a própria ficha e os menores a cargo. Nomes de outras pessoas vêm da vista `team_directory` (`teamDirectory`, `personName(id)`). Datas de nascimento e NIF de terceiros nunca são usados; os aniversários da equipa ficam escondidos (`canViewTeamPersonalData`).
- Cancelar uma inscrição marca-a como `cancelled` (o atleta não pode apagar linhas); o admin apaga.
- Dorsais não são atribuídos automaticamente na inscrição (a guarda recusa dorsais a atletas): ficam `pending` até o admin os tratar.
- Os avisos automáticos para a equipa (ex.: "X cancelou a inscrição", "prova sugerida") só são criados por administradores, porque a guarda dos comunicados só deixa o admin inserir.
- A presença em eventos e as leituras de comunicados juntam-se ao que está no servidor (leitura + escrita só do campo), para dois utilizadores simultâneos não se apagarem.
- "Mudar de utilizador" e "Repor dados" ficam desativados: cada pessoa entra com a sua conta e a app nunca apaga a base de dados.
- A app já não semeia a base de dados quando está vazia.

## Carrinha: concorrência (risco documentado, correção proposta)
`van_requested_at` é escrito pelo relógio do telemóvel, por isso a ordem da fila pode ser errada (relógios diferentes) ou manipulada. Com o RLS atual duas inscrições nunca se sobrepõem na base de dados, mas a posição final é calculada no cliente.

Proposta em `supabase/migrations/20261125_van_requests.sql` (**não aplicada**): um trigger que fixa `van_requested_at` com o relógio do servidor e uma função `van_position(reg_id)` só de leitura. A app já guarda a linha devolvida pelo servidor após inserir, por isso não é preciso alterar o cliente. Fica de fora uma RPC de escrita, que duplicaria as regras de capacidade por veículo que hoje vivem em `computeVanAllocation`.

## Riscos conhecidos
- Reverter é por item: se duas operações concorrentes tocarem no mesmo registo, a reversão repõe o estado anterior a essa operação.
- Sem rede não há escritas (não há fila offline; é a fase 5 do plano).
- Avisos de cancelamento feitos por atletas precisam de uma função `security definer` no servidor (não incluída).
