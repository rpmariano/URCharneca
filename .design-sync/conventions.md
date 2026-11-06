# U.R. Charneca Atletismo — como construir com esta biblioteca

App móvel (coluna de ~400 px) para gerir uma equipa de atletismo amador: provas (Troféu de Cascais, provas do clube, provas sugeridas por atletas), treinos, eventos, carrinha do clube, comunicados e perfis infantis. Estilo "run club" nas cores do clube (azul do equipamento, branco e dourado do emblema): fundo branco, azul como cor de destaque (`--run`) e dourado (`--gold`, texto escuro `--on-gold`) em destaques, Troféu de Cascais e perfil de admin, títulos condensados em maiúsculas, números grandes, movimento curto. Textos da interface em português de Portugal.

## Setup obrigatório
- Envolver tudo em `<AppProvider>` (dá os dados de exemplo e o utilizador atual aos componentes da app: `RaceListItem`, `RaceCard`, `EventListItem`, `RsvpButtons`, modais). Sem ele, esses componentes rebentam.
- Cada ecrã dentro de `<Screen>`: aplica `--bg-app`, a cor do texto e a fonte. Fora dele os componentes ficam sobre fundo branco e os botões `secondary`/`ghost` desaparecem.
- Tema: atributo `data-theme` no `<html>` — `balanced` (omissão: azul e branco; `light` é equivalente) e `dark` (azul-marinho + branco). Não codificar cores; usar as variáveis.

```jsx
const { AppProvider, Screen, PageHeader, SectionTitle, RaceListItem, Button, demoRaces } = window.URCharneca
<AppProvider>
  <Screen>
    <PageHeader eyebrow="Agenda da equipa" title="Atividades" action={<Button size="sm">Criar</Button>} />
    <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
      <SectionTitle title="Próximas provas" action="Todas" onAction={() => {}} />
      {demoRaces.slice(0, 3).map((r) => <RaceListItem key={r.id} race={r} onOpen={() => {}} />)}
    </div>
  </Screen>
</AppProvider>
```

## Estilo: variáveis CSS (não há tokens em props)
- Fundos: `--bg-app`, `--bg-sheet`, `--surface-card`, `--surface-raised`. Bordas: `--border-card`, `--border-card-strong`.
- Texto: `--text-1` (principal), `--text-2`, `--text-3` (secundário), `--text-muted`.
- Destaque: `--run` (azul do equipamento) e `--on-accent` (texto sobre o destaque). Usar o destaque só em ações principais, números e estado ativo.
- Tipos de atividade (sempre esta cor para o mesmo tipo): `--cat-trofeu`, `--cat-clube`, `--cat-sugerida`, `--cat-treino`, `--cat-evento`. Em JS: `KIND_COLOR.trofeu_cascais | equipa | individual | training | event`.
- Estados: `--tint-{emerald|amber|blue|rose}-{bg|fg|border}`; perigo `--danger`.
- Fontes: `--font-display` (Barlow Condensed) para títulos e números; `--font-sans` (Inter) para texto.

## Classes utilitárias próprias (em `styles.css`)
- `display` — título condensado, 900, maiúsculas (ex.: `className="display text-[40px]"`). Tamanhos compilados: `text-[22px]`, `text-[28px]`, `text-[32px]`, `text-[40px]`, `text-[44px]`, `text-[48px]`, `text-[56px]`.
- `stat-num` — número grande condensado tabular; `eyebrow` — rótulo pequeno em maiúsculas espaçadas.
- `iron-card` — superfície de cartão; `hero-card` — cartão de destaque com brilho azul.
- `stagger` — entrada escalonada dos filhos; `grow-x` — barra que cresce; `live-dot` — ponto pulsante; `snap-row` — carrossel horizontal com snap.
- Utilitários Tailwind só existem se a app os usa; para layout próprio preferir `style={{ display: 'grid', gap }}` com `var(--*)`.

## Componentes e padrões
- Primitivas: `Button` (primary/secondary/ghost/danger, pílula), `Card` (`accent` = faixa de cor do tipo), `Chip` (filtros), `Tag` (estado), `KindBadge` (tipo), `DateBlock`, `Avatar` (`child` para crianças), `StatTile`, `EmptyState`.
- Estrutura: `Screen`, `PageHeader`, `SectionTitle`, `Segmented` (tabs). Formulários: `Field` + classe `inputClass` no `<input>/<select>`, `Toggle`, `AthleteForm`, `ChildForm`.
- Sobreposições: `Sheet` (bottom-sheet em portal) + `SheetHeader`; modais da app `RaceDetailModal`, `EventDetailModal`, `CreateRaceModal`, `CreateEventModal`, `CreateNoticeModal`.
- Dados de exemplo: `demoRaces`, `demoEvents`, `demoProfiles`, `demoChildren`, `demoNotices`. As provas futuras ficam relativas à data atual; para contagens decrescentes em maquetas, criar cópias com `date` relativo a hoje.
- Regras de produto: só o admin cria provas oficiais, treinos, eventos e comunicados; o atleta inscreve-se, reserva lugar na carrinha, sugere provas e inscreve as crianças a seu cargo apenas em provas com `open_to_children`.

Docs por componente: `components/<grupo>/<Nome>/<Nome>.prompt.md`. Antes de estilizar, ler `styles.css` e `_ds_bundle.css`.
