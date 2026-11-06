# design-sync — notas da U.R. Charneca

## Como a biblioteca é construída
- O repositório é uma **app** (Vite + React 19 + Tailwind v4), não um pacote. A biblioteca sincronizada vem de `src/design-system/index.ts`, construída pelo subpacote `design-system/` (`@urcharneca/ui`) com `npm run build:ds` (vite lib → `design-system/dist/index.js` + `ui.css`; `tsc` → `.d.ts` em `design-system/dist/types/`).
- Comando do conversor (raiz do repo):
  `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./design-system/dist/index.js --out ./ds-bundle`
- `srcDir` é `../src` (relativo a `design-system/`); todos os componentes estão fixados em `componentSrcMap` porque vários vivem no mesmo ficheiro (`src/components/ui.tsx`).
- O CSS do bundle é o Tailwind compilado de toda a app + os tokens de `src/index.css` (`cssEntry: dist/ui.css`). Fontes via Google Fonts `@import` (`[FONT_REMOTE]`, esperado).
- Grupos definidos por stubs em `.design-sync/docs/*.md` (só `category`), ligados por `docsMap`.
- `dtsPropsFor`: Button/Card (o extrator filtrava `onClick`/`disabled`), Segmented (genérico), e componentes que recebem `Race`/`TeamEvent`/fichas (tipos de domínio escritos em forma estrutural).

## Aprendizagens das pré-visualizações
- O harness de captura **congela o relógio (2024)**. Componentes com contagem decrescente (`RaceCard`) mostravam "921 dias": as pré-visualizações criam cópias das provas com datas relativas a `new Date()`.
- O fundo da página de pré-visualização é branco: todas as primitivas são envolvidas em `<Screen>` (criado para isto e exportado para o agente).
- Modais (`Sheet`, `*Modal`) usam portal + `position: fixed`: `cardMode: single`, `viewport: 420x820`.
- Componentes com largura fixa de ~400 px usam `cardMode: column` (avisos `[GRID_OVERFLOW]`).
- `AppProvider` é o provider de todas as pré-visualizações; arranca com o utilizador Rui Mariano em vista de admin (dados de `src/data/seedData.ts`, localStorage `urc_*_v4`).

## Known render warns
- Nenhum pendente após `cardMode` (os `[RENDER_THIN]` iniciais eram floor cards antes de haver pré-visualizações).

## Re-sync risks
- `dtsPropsFor` duplica a forma de `Race`, `TeamEvent`, ficha de atleta e de criança: se `src/types.ts` mudar, atualizar à mão.
- Os dados de exemplo (`demoRaces`, …) têm datas de novembro/dezembro de 2026; com o tempo ficam no passado (as listas mostram-nas esbatidas). `RaceCard` já usa datas relativas; rever as outras pré-visualizações se ficarem estranhas.
- `componentSrcMap` fixa caminhos: mover/renomear ficheiros em `src/components` exige atualizar o config.
- Playwright fixado em 1.62.1 para casar com o chromium-1234 em cache (`%LOCALAPPDATA%/ms-playwright`).
- O DesignSync numa sessão não interativa (app desktop) precisa de autorização criada antes com `/design-login` numa sessão `claude` interativa no terminal; depois disso a app desktop reutiliza-a.

## Projeto e upload
- Projeto: "URCharneca Design System" (`projectId` em config.json) — https://claude.ai/design/p/8da5b68c-fed7-4249-8b5c-da9d340a4ead
- Primeira sincronização (2026-11-06): 146 ficheiros + sentinela + `_ds_sync.json`; sem `tokens/`, `fonts/` nem `guidelines/` (fontes via Google Fonts, tokens em `styles.css`).
- Re-sync: projeto fixado → caminho atómico; usar `resync.mjs` com `--remote` apontado para o `_ds_sync.json` descarregado do projeto.
