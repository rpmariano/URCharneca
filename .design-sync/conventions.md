# U.R. Charneca Atletismo — como construir com esta biblioteca

App móvel (coluna de ~400 px) para gerir uma equipa de atletismo amador: provas (Troféu de Cascais, provas do clube, provas sugeridas por atletas), treinos, eventos, carrinha do clube, comunicados e perfis infantis. Estilo "explorar": fundo branco, muito espaço em branco, cartões com capa, sombras suaves, um só tipo de letra (Inter) com títulos em minúsculas. Cores do clube: azul do equipamento (`--run`) nas ações, dourado do emblema (`--gold`) em destaques pontuais. Textos da interface em português de Portugal.

## Setup obrigatório
- Envolver tudo em `<AppProvider>` (dá os dados de exemplo e o utilizador atual aos componentes da app: `RaceListItem`, `RaceCard`, `EventListItem`, `RsvpButtons`, `RaceDetail`, `EventDetail`, modais `Create*`). Sem ele, esses componentes rebentam.
- Cada ecrã dentro de `<Screen>`: aplica `--bg-app`, a cor do texto e a fonte (padding de 20 px; `padded={false}` para capas a toda a largura).
- Tema: atributo `data-theme` no `<html>` — omissão (claro) ou `dark` (azul-marinho). Não codificar cores; usar as variáveis.

```jsx
const { AppProvider, Screen, SearchPill, CategoryTabs, SectionTitle, RaceCard, RaceListItem, KIND_ICON, demoRaces } = window.URCharneca
<AppProvider>
  <Screen>
    <SearchPill value={q} onChange={setQ} placeholder="Procurar provas, treinos, locais" />
    <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      <SectionTitle title="Próximas provas" action="Ver todas" onAction={() => {}} />
      <div className="snap-row">
        {demoRaces.slice(0, 5).map((r) => <RaceCard key={r.id} race={r} onOpen={() => {}} />)}
      </div>
    </div>
  </Screen>
</AppProvider>
```

## Estilo: variáveis CSS (não há tokens em props)
- Fundos: `--bg-app`, `--bg-sheet`, `--surface-card`, `--surface-raised`. Bordas: `--border-card`, `--border-card-strong`.
- Texto: `--text-1` (principal), `--text-2`, `--text-3` (secundário), `--text-muted`.
- Ação e destaque: `--run` (azul) com `--on-accent`; `--gold` com `--on-gold`, e `--gold-ink` para dourado como texto. Regra 60/30/10: branco / texto azul-marinho / azul e dourado.
- Tipos de atividade (sempre a mesma cor e ícone por tipo): `--cat-trofeu`, `--cat-clube`, `--cat-sugerida`, `--cat-treino`, `--cat-evento`. Em JS: `KIND_COLOR` e `KIND_ICON` com as chaves `trofeu_cascais | equipa | individual | training | event`.
- Estados: `--tint-{emerald|amber|blue|rose}-{bg|fg|border}`. Sombras: `--shadow-card`, `--shadow-float`.

## Classes utilitárias próprias (em `styles.css`)
- Tipografia (4 tamanhos, 2 pesos): `t-title` (26 px/600), `t-heading` (18 px/600), `t-body` (15 px), `t-small` (13 px); `t-strong` (600); `t-num` (algarismos tabulares). Nada abaixo de 12 px; sem maiúsculas forçadas.
- Superfícies: `card` (contorno, raio 16), `card-raised` (com sombra, raio 20), `pressable` (feedback ao toque), `divide-soft` (linhas entre filhos).
- Listas: `snap-row` (carrossel horizontal com snap), `scroll-row` (fila horizontal).
- Movimento: `stagger` (entrada escalonada dos filhos), `sheet-in`, `fade-in`, `pop-in`.
- Utilitários Tailwind só existem se a app os usa; para layout próprio preferir `style={{ display: 'grid', gap }}` com `var(--*)`. Espaçamentos em múltiplos de 4/8 px; alvos de toque com 44 px no mínimo.

## Componentes e padrões
- Explorar: `SearchPill` (pesquisa em pílula), `CategoryTabs` (categorias com ícone), `Chip` (filtros), `ActivityCover` (capa gerada por tipo ou `imageUrl`).
- Cartões de atividade: `RaceCard` (carrossel), `RaceListItem` e `EventListItem` (lista; `compact` = linha com miniatura; `showRsvp` junta `RsvpButtons`).
- Detalhe em página inteira: `RaceDetail`, `EventDetail` (capa, factos com ícone, "Quem vai" e barra fixa). Para ecrãs próprios: `StickyActionBar` (resumo à esquerda, botão principal à direita, na zona do polegar).
- Primitivas: `Button` (primary/secondary/ghost/danger, cantos arredondados), `IconButton` (`floating` sobre capas), `Card`, `Tag` (estado), `KindBadge` (tipo), `DateBlock`, `Avatar` (`child` para crianças), `StatTile`, `EmptyState` (ícone, título, texto e ação).
- Estrutura: `Screen`, `PageHeader`, `SectionTitle`, `ListRow` (linha de menu com seta), `Segmented`. Formulários: `Field` + classe `inputClass` no `<input>/<select>`, `Toggle`, `AthleteForm`, `ChildForm`.
- Sobreposições: `Sheet` (bottom-sheet em portal) + `SheetHeader`; `CreateRaceModal`, `CreateEventModal`, `CreateNoticeModal`.
- Dados de exemplo: `demoRaces`, `demoEvents`, `demoProfiles`, `demoChildren`, `demoNotices`.
- Regras de produto: só o admin cria provas oficiais, treinos, eventos e comunicados; o atleta inscreve-se, reserva lugar na carrinha, sugere provas e inscreve as crianças a seu cargo apenas em provas com `open_to_children`.

Docs por componente: `components/<grupo>/<Nome>/<Nome>.prompt.md`. Antes de estilizar, ler `styles.css` e `_ds_bundle.css`.
