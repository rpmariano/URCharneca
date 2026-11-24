# Plano: equipa de agentes para Supabase + utilizadores + UI mobile/desktop

## Objetivo
Passar a app de `localStorage` para Supabase (base de dados, utilizadores reais com login, permissões) e ter uma UI que funcione bem em telemóvel e em computador, sem perder as regras atuais (admin/atleta, crianças, carrinha, dorsais, prazos).

## Equipa

| Agente | Responsabilidade | É dono de | Modelo / esforço |
|---|---|---|---|
| **Coordenador** | Divide o trabalho, ordena as fases, resolve conflitos, revê cada PR, mantém este plano e a lista de decisões. Não escreve código de funcionalidades. | `docs/`, PRs, ramos | Opus, esforço alto |
| **Dados (Supabase)** | Esquema, migrações, índices, funções SQL (ex.: atribuição de lugares na carrinha, promoção da lista de espera), dados de teste anonimizados. | `supabase/migrations/`, `supabase_schema.sql` | Opus, médio |
| **Segurança e Auth** | Login (Supabase Auth), tabela `profiles` ligada a `auth.users`, papéis, políticas RLS por tabela, convites, sem chaves secretas no repositório (repo é público). | `supabase/policies/`, `src/auth/` | Opus, alto |
| **Camada de dados (app)** | Substitui o `AppContext` baseado em localStorage por um cliente Supabase com a mesma interface; cache, estados de carregamento e erro, migração dos dados locais. | `src/context/`, `src/data/`, `src/lib/supabase.ts` | Sonnet, alto |
| **UI Mobile** | Fluxos atuais em ecrã pequeno, ecrãs de login/convite/perfil, estados de carregamento, vazio e erro. | `src/pages/`, `src/components/` (mobile) | Sonnet, médio |
| **UI Desktop** | Layout responsivo: barra lateral em vez da navegação inferior, detalhe em duas colunas, tabelas de gestão para admin, atalhos de teclado. | `src/layout/`, `src/index.css` (breakpoints) | Sonnet, médio |
| **Design system** | Tokens e componentes partilhados pelos dois layouts, atualização da biblioteca `src/design-system` e do artefacto no Claude. | `src/design-system/`, `.design-sync/` | Sonnet, baixo |
| **QA e acessibilidade** | Testes (Vitest para lógica, Playwright para fluxos), contraste, alvos de toque, teclado, testes das políticas RLS com utilizadores de teste. | `tests/`, CI | Sonnet, médio |
| **DevOps** | Variáveis de ambiente no GitHub Pages (URL e chave anónima), projeto Supabase de teste e de produção, CI com build, testes e migrações. | `.github/`, `vite.config.ts` | Haiku/Sonnet, baixo |

## Regras de funcionamento
- O coordenador cria um ramo e um PR por fase. Cada agente trabalha num worktree próprio e só escreve nos ficheiros de que é dono; dois agentes nunca editam os mesmos ficheiros em simultâneo.
- Contratos primeiro: o agente de Dados publica o esquema e os tipos TypeScript; os outros só começam a usá-los depois.
- Nada é fundido sem build a passar, testes a passar e revisão do coordenador. Fundir só com o teu "segue".
- Qualquer ação no Supabase de produção (migrações, políticas) passa por ti antes de correr. Desenvolvimento acontece num projeto Supabase de teste.

## Fases

1. **Fundações (Coordenador, Dados, Segurança, DevOps)**
   Criar projeto Supabase de teste. Esquema: `profiles`, `children`, `races`, `registrations`, `events`, `event_rsvps`, `trainings`, `notices`, `bibs`. Papéis admin/atleta. RLS: o atleta só vê e altera as suas inscrições e as dos filhos; o admin gere tudo; leitura pública só do que for para equipa. Tipos gerados e dados de teste anonimizados.
2. **Auth e perfis (Segurança, UI Mobile)**
   Login por link no email (ou o método que escolheres), primeiro acesso, ligação de utilizador a perfil de atleta existente por convite, mudar de utilizador deixa de existir (cada um entra com a sua conta).
3. **Camada de dados (Camada de dados, QA)**
   Trocar localStorage por Supabase mantendo as regras (prazo, carrinha por ordem de pedido, lista de espera, avisos à equipa). Funções críticas passam para o servidor para evitar corridas (dois pedidos ao último lugar). Importar dados locais existentes.
4. **UI desktop (UI Desktop, Design system)**
   Breakpoints, barra lateral, detalhe em duas colunas, gestão em tabela. Mobile fica como está.
5. **Tempo real e offline (Camada de dados, QA)**
   Atualização em direto de inscrições e avisos; PWA com leitura offline e fila de pedidos.
6. **Endurecimento e lançamento (QA, Segurança, DevOps)**
   Testes de permissões com utilizadores falsos, auditoria de RLS, cópia de segurança, projeto de produção, migração, publicação.

## Decisões tomadas
- **Login:** quem tem conta Google entra com Google; quem não tem entra com email e palavra-passe. Só por convite do admin: o admin regista o email do atleta, o convite cria a conta e liga-a ao perfil. Sem registo livre.
- **Crianças:** perfis dependentes de um responsável, sem conta própria.
- **Dados reais:** o admin preenche-os na app depois de o Supabase estar montado. O repositório mantém só dados anonimizados.
- **Plano Supabase:** começa gratuito e passa a pago. Até lá: pausa por inatividade (um pedido agendado semanal evita-o), limites pequenos de armazenamento, sem cópias de segurança diárias (exportar à mão antes de cada migração). O pago acrescenta cópias, sem pausa e mais capacidade; nada no código muda.
- **Desktop:** a interface é para telemóvel e para browser de computador (>= 1024 px), atleta e admin; não há tratamento de tablet (abaixo de 1024 px a app é a de telemóvel). No computador todos têm barra lateral, cabeçalho fixo e conteúdo largo; Gerir, tabelas de gestão e exportação CSV ficam só para o admin.

## Ajustes às fases por causa destas decisões
- Fase 2: ativar o fornecedor Google no Supabase Auth (precisa de um cliente OAuth no Google Cloud, feito por ti) e email e palavra-passe; convite por função de servidor (Edge Function) com a chave de serviço guardada só no Supabase, nunca no repositório. Recuperação de palavra-passe incluída.
- Fase 3: ecrã de admin para criar atletas e crianças e enviar convites; importação passa a ser manual pelo admin, não de localStorage.
- Fase 4: shell de computador para todos (ver decisão Desktop); tabelas de gestão só para o admin.
- Fase 6: guia de passagem ao plano pago.
