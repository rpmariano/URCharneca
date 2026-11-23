import { describe, expect, it } from 'vitest'
import {
  aggregateAthletes,
  buildUrcStandings,
  cellText,
  computeClubStandings,
  crossCheckUrc,
  decodeEntities,
  escalaoLabel,
  isDateInSeason,
  isUrcClub,
  matchCompetitionsToRaces,
  matchFicha,
  mergeStanding,
  minStagesForPrize,
  parseBlockHeader,
  parseClassificationPage,
  parseCollectivePage,
  parseCompetitionPage,
  pointsForPlace,
  rankAthletes,
  seasonStartYear,
  titleCaseName,
  todayLisbon,
  type ClassificationRow,
  type ClubRow,
  type FichaLite,
} from '../../supabase/functions/trofeu-sync/parse'
import { TROFEU_POINTS_TABLE } from '../../src/data/trofeuData'

// ---------------------------------------------------------------------------
// Fixtures SINTÉTICAS: HTML inventado com a mesma estrutura do site, nomes fictícios.
// ---------------------------------------------------------------------------

interface FxRow {
  pos: number | string
  dorsal: string
  name: string
  club?: string
  esc: string
  time?: string
  pts?: number | string
}

function classRow(r: FxRow): string {
  const club = r.club
    ? `<img title="${r.club}" alt="${r.club}" height="25" width="25" /><span> ${r.club}</span>`
    : '&nbsp;'
  return `<tr>
    <td class="text-center" nowrap="nowrap">${r.pos}</td><td class="text-center" nowrap="nowrap">${r.dorsal}</td><td nowrap="nowrap">${r.name}</td><td class="text-center" nowrap="nowrap">${club}</td><td class="text-center" nowrap="nowrap">${r.esc}</td><td class="text-center" nowrap="nowrap"><img title="POR" alt="POR" /></td><td class="text-center" nowrap="nowrap">${r.time ?? '20:00'}</td><td class="text-center" nowrap="nowrap">${r.pts ?? ''}</td>
  </tr>`
}

function classPage(blocks: { header: string; rows: FxRow[] }[]): string {
  const body = blocks
    .map(
      (b, i) => `
    <h5 id="MainContent_RepeaterDias_RepeaterProvas_0_nome_prova_${i}" class="according-header">${(i + 1) * 1000} metros (09:30)</h5>
    <div class="row"><span id="MainContent_X_listaEcraResultados_0_nome_bloco_${i}">${b.header}</span></div>
    <table class="table" id="MainContent_X_GridView_Resultados_${i}">
      <thead><tr><th scope="col">Pos</th><th scope="col">Dorsal</th><th scope="col">Nome</th><th scope="col">Clube</th><th scope="col">Escal&#227;o</th><th scope="col">Nac</th><th scope="col">Marca</th><th scope="col">Pontos</th></tr></thead>
      <tbody>${b.rows.map(classRow).join('')}</tbody>
    </table>`,
    )
    .join('\n')
  return `<html><body>${body}</body></html>`
}

function collTable(id: string, rows: ClubRow[]): string {
  return `<table id="${id}"><thead><tr><th>Posi&#231;&#227;o</th><th>SIGLA</th><th>Nome Equipa</th><th>N&#186; Atletas</th><th>Pontos</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr><td>${r.pos}</td><td>${r.sigla}</td><td>${r.name}</td><td>${r.athletes}</td><td>${r.points}</td></tr>`,
    )
    .join('')}</tbody></table>`
}

function collPage(rows: ClubRow[]): string {
  return `<html><body>
    ${collTable('MainContent_listaEcraMasculina_GridView_Resultados', [])}
    ${collTable('MainContent_listaEcraFeminina_GridView_Resultados', [])}
    ${collTable('MainContent_listaEcraMista_GridView_Resultados', rows)}
  </body></html>`
}

const URC = 'U R CHARNECA'

// ---------------------------------------------------------------------------

describe('texto e nomes', () => {
  it('decodifica entidades numéricas, hex e nomeadas', () => {
    expect(decodeEntities('Ab&#243;boda &amp; Co &#x41; &nbsp;|')).toBe('Abóboda & Co A  |')
    expect(decodeEntities('&desconhecida;')).toBe('&desconhecida;')
  })
  it('cellText remove etiquetas, nbsp e espaços repetidos', () => {
    expect(cellText('<td> <img alt="x"/><span>  U R  CHARNECA </span>&nbsp;</td>')).toBe('U R CHARNECA')
    expect(cellText('&nbsp;')).toBe('')
  })
  it('titleCaseName põe em Title Case e mantém partículas em minúsculas', () => {
    expect(titleCaseName('ANA MARIA DA SILVA E SOUSA')).toBe('Ana Maria da Silva e Sousa')
    expect(titleCaseName('JOÃO-PEDRO D\'AVILA')).toBe("João-Pedro D'Avila")
    expect(titleCaseName('DE LUCA')).toBe('De Luca') // a primeira palavra nunca é partícula
  })
  it('isUrcClub reconhece sigla e nome completo, e só esses', () => {
    expect(isUrcClub('U R CHARNECA')).toBe(true)
    expect(isUrcClub('UNIÃO RECREATIVA DA CHARNECA')).toBe(true)
    expect(isUrcClub('CHARNECA DE CAPARICA')).toBe(false)
    expect(isUrcClub('')).toBe(false)
  })
})

describe('pontos por prova', () => {
  it('pointsForPlace coincide com TROFEU_POINTS_TABLE da app', () => {
    const expand = (label: string): number[] => {
      const range = /(\d+)º ao (\d+)º/.exec(label)
      if (range) return Array.from({ length: +range[2] - +range[1] + 1 }, (_, i) => +range[1] + i)
      const upTo = /(\d+)º até último/.exec(label)
      if (upTo) return [+upTo[1], 45, 100]
      return [parseInt(label, 10)]
    }
    for (const row of TROFEU_POINTS_TABLE) {
      for (const place of expand(row.label)) expect(pointsForPlace(place)).toBe(row.points)
    }
    expect(pointsForPlace(0)).toBe(0)
  })
})

describe('parseCompetitionPage', () => {
  const page = (nome: string, data: string) => `
    <h4 id="MainContent_EventoDetalhe_span_nome">${nome}</h4>
    <h4 id="MainContent_EventoDetalhe_span_data" style="display: inline">${data}</h4>
    <h4 id="MainContent_EventoDetalhe_span_hora" style="display: inline">In&#237;cio &#224;s 09:30</h4>
    <h4 id="MainContent_EventoDetalhe_span_localidade" style="display: inline">Vila Exemplo.</h4>`

  it('lê título, data ISO, hora e local', () => {
    expect(parseCompetitionPage(page('1&#186; Grande Pr&#233;mio Exemplo', '22-11-2026'))).toEqual({
      title: '1º Grande Prémio Exemplo',
      date: '2026-11-22',
      time: '09:30',
      location: 'Vila Exemplo',
    })
  })
  it('id inexistente (modelo vazio) ou data inválida devolve null', () => {
    expect(parseCompetitionPage(page('', ''))).toBeNull()
    expect(parseCompetitionPage(page('Prova', '2026-11-22'))).toBeNull()
    expect(parseCompetitionPage('<html></html>')).toBeNull()
  })
})

describe('cabeçalhos de bloco, género e escalão', () => {
  it('extrai escalão e género do cabeçalho', () => {
    expect(parseBlockHeader('M35  (Masculino)')).toEqual({ base: 'M35', gender: 'M' })
    expect(parseBlockHeader('Seniores  (Feminino)')).toEqual({ base: 'Seniores', gender: 'F' })
    expect(parseBlockHeader('Sub-12 (M)')).toEqual({ base: 'Sub-12', gender: 'M' })
    expect(parseBlockHeader('F40')).toEqual({ base: 'F40', gender: 'F' })
    expect(parseBlockHeader('Sub-18')).toEqual({ base: 'Sub-18', gender: null })
    expect(parseBlockHeader('   ')).toBeNull()
  })
  it('rótulo de escalão no formato da app', () => {
    expect(escalaoLabel('M35', 'M')).toBe('M35')
    expect(escalaoLabel('F60', 'F')).toBe('F60')
    expect(escalaoLabel('Seniores', 'F')).toBe('Seniores (F)')
    expect(escalaoLabel('Sub-12', 'M')).toBe('Sub-12 (M)')
  })
})

describe('parseClassificationPage', () => {
  const html = classPage([
    {
      header: 'M35  (Masculino)',
      rows: [
        { pos: 1, dorsal: '101', name: 'BRUNO EXEMPLO DA COSTA', club: 'OS EXEMPLOS', esc: 'M35', time: '20:21', pts: 15 },
        { pos: 2, dorsal: '102', name: 'CARLOS TESTE', club: URC, esc: 'M35', time: '20:39', pts: 13 },
        { pos: 3, dorsal: '103', name: 'DIOGO SEM CLUBE', esc: 'M35', time: '21:06', pts: '' }, // sem clube e sem pontos
        { pos: '-', dorsal: '104', name: 'ELISIO DESISTENTE', club: URC, esc: 'M35', pts: '' }, // sem lugar
      ],
    },
    {
      header: 'Sub-12  (Feminino)',
      rows: [{ pos: 1, dorsal: '201', name: 'FILIPA FICTICIA', club: URC, esc: 'Sub-12', time: '2:10', pts: 15 }],
    },
    {
      header: 'Seniores  (Masculino)',
      rows: [{ pos: 1, dorsal: '301', name: 'GONCALO EXEMPLO', club: URC, esc: 'Seniores', pts: 15 }],
    },
  ])
  const rows = parseClassificationPage(html)

  it('lê as linhas válidas e ignora as sem lugar numérico', () => {
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r.dorsal)).toEqual(['101', '102', '103', '201', '301'])
  })
  it('género e escalão vêm do cabeçalho do bloco', () => {
    expect(rows[0]).toMatchObject({ gender: 'M', escalao: 'M35', escalaoBase: 'M35' })
    expect(rows[3]).toMatchObject({ gender: 'F', escalao: 'Sub-12 (F)', escalaoBase: 'Sub-12' })
    expect(rows[4]).toMatchObject({ gender: 'M', escalao: 'Seniores (M)' })
  })
  it('clube = sigla do <span>; vazio quando não há clube', () => {
    expect(rows[0].club).toBe('OS EXEMPLOS')
    expect(rows[1].club).toBe(URC)
    expect(rows[2].club).toBe('')
  })
  it('pontos da coluna Pontos; se vazia usa a tabela do regulamento', () => {
    expect(rows[0].points).toBe(15)
    expect(rows[1].points).toBe(13)
    expect(rows[2].points).toBe(11) // 3.º lugar
  })
  it('marca (tempo) e nome tal como no site', () => {
    expect(rows[0]).toMatchObject({ time: '20:21', name: 'BRUNO EXEMPLO DA COSTA', pos: 1 })
  })
  it('página sem tabelas ou com cabeçalhos desconhecidos devolve []', () => {
    expect(parseClassificationPage('<html></html>')).toEqual([])
    expect(parseClassificationPage('<table><tr><th>X</th></tr><tr><td>1</td></tr></table>')).toEqual([])
  })
})

describe('parseCollectivePage', () => {
  it('lê a tabela "Coletivo Misto" e ignora as vazias', () => {
    const rows = parseCollectivePage(
      collPage([
        { pos: 1, sigla: 'EXE', name: 'Exemplos Atletismo', athletes: 90, points: 500 },
        { pos: 2, sigla: URC, name: 'UNI&#195;O RECREATIVA DA CHARNECA', athletes: 40, points: 300 },
      ]),
    )
    expect(rows).toEqual([
      { pos: 1, sigla: 'EXE', name: 'Exemplos Atletismo', athletes: 90, points: 500 },
      { pos: 2, sigla: URC, name: 'UNIÃO RECREATIVA DA CHARNECA', athletes: 40, points: 300 },
    ])
  })
  it('sem dados devolve []', () => {
    expect(parseCollectivePage(collPage([]))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------

function row(over: Partial<ClassificationRow> & Pick<ClassificationRow, 'pos' | 'dorsal' | 'name'>): ClassificationRow {
  return {
    club: URC,
    escalaoBase: 'M35',
    gender: 'M',
    escalao: 'M35',
    points: pointsForPlace(over.pos),
    ...over,
  }
}

describe('aggregateAthletes (soma por dorsal)', () => {
  it('soma pontos de várias provas pelo dorsal e guarda pos/pontos/tempo por etapa', () => {
    const agg = aggregateAthletes([
      { code: 'P2', competitionId: 902, raceId: 'r2', rows: [row({ pos: 3, dorsal: '1', name: 'ANA TESTE', time: '10:00' })] },
      { code: 'P1', competitionId: 901, raceId: 'r1', rows: [row({ pos: 1, dorsal: '1', name: 'ANA TESTE' })] },
    ])
    expect(agg).toHaveLength(1)
    expect(agg[0].total).toBe(15 + 11)
    expect(agg[0].stagesParticipated).toBe(2)
    expect(agg[0].firsts).toBe(1)
    expect(agg[0].thirds).toBe(1)
    expect(agg[0].results.P2).toEqual({ pos: 3, points: 11, time: '10:00', competition_id: 902, race_id: 'r2' })
    expect(agg[0].results.P1).toEqual({ pos: 1, points: 15, competition_id: 901, race_id: 'r1' })
  })
  it('o escalão e o nome vêm da prova mais recente', () => {
    const agg = aggregateAthletes([
      { code: 'P1', rows: [row({ pos: 1, dorsal: '7', name: 'ANA ANTIGA', escalao: 'M35', escalaoBase: 'M35' })] },
      { code: 'P2', rows: [row({ pos: 2, dorsal: '7', name: 'ANA NOVA', escalao: 'M40', escalaoBase: 'M40' })] },
    ])
    expect(agg[0]).toMatchObject({ name: 'ANA NOVA', escalao: 'M40' })
  })
  it('dorsal repetido na mesma prova conta uma só vez (melhor lugar)', () => {
    const agg = aggregateAthletes([
      { code: 'P1', rows: [row({ pos: 5, dorsal: '9', name: 'X' }), row({ pos: 2, dorsal: '9', name: 'X' })] },
    ])
    expect(agg).toHaveLength(1)
    expect(agg[0].total).toBe(13)
  })
})

describe('rankAthletes (por escalão, todos os clubes)', () => {
  const mk = (stages: { code: string; rows: ClassificationRow[] }[]) => rankAthletes(aggregateAthletes(stages))
  const byName = (list: { name: string; pos: number }[], name: string) => list.find((a) => a.name === name)!

  it('ordena por pontos dentro do escalão e não mistura escalões nem géneros', () => {
    const ranked = mk([
      {
        code: 'P1',
        rows: [
          row({ pos: 1, dorsal: '1', name: 'A' }),
          row({ pos: 2, dorsal: '2', name: 'B' }),
          row({ pos: 1, dorsal: '3', name: 'C', escalao: 'M40', escalaoBase: 'M40' }),
          row({ pos: 1, dorsal: '4', name: 'D', gender: 'F', escalao: 'F35', escalaoBase: 'F35' }),
        ],
      },
    ])
    expect(byName(ranked, 'A').pos).toBe(1)
    expect(byName(ranked, 'B').pos).toBe(2)
    expect(byName(ranked, 'C').pos).toBe(1)
    expect(byName(ranked, 'D').pos).toBe(1)
  })

  it('desempate 1: mais provas disputadas', () => {
    // X: 15 numa prova; Y: 9 + 6 = 15 em duas provas -> Y à frente
    const ranked = mk([
      { code: 'P1', rows: [row({ pos: 1, dorsal: '1', name: 'X' }), row({ pos: 5, dorsal: '2', name: 'Y' })] },
      { code: 'P2', rows: [row({ pos: 8, dorsal: '2', name: 'Y' })] },
    ])
    expect(byName(ranked, 'X').total).toBe(15)
    expect(byName(ranked, 'Y').total).toBe(15)
    expect(byName(ranked, 'Y').pos).toBe(1)
    expect(byName(ranked, 'X').pos).toBe(2)
  })

  it('desempate 2: mais 1.os lugares; 3: mais 2.os; 4: mais 3.os', () => {
    // mesmos pontos (26) e mesmas 2 provas, composições diferentes de lugares
    const ranked = mk([
      {
        code: 'P1',
        rows: [
          row({ pos: 1, dorsal: '1', name: 'W' }), // 15
          row({ pos: 2, dorsal: '2', name: 'V' }), // 13
          row({ pos: 3, dorsal: '3', name: 'U' }), // 11
        ],
      },
      {
        code: 'P2',
        rows: [
          row({ pos: 3, dorsal: '1', name: 'W' }), // 11 -> 26
          row({ pos: 2, dorsal: '2', name: 'V' }), // 13 -> 26
          row({ pos: 1, dorsal: '3', name: 'U' }), // 15 -> 26
        ],
      },
    ])
    // W: 1º+3º ; V: 2º+2º ; U: 3º+1º. Todos 26 pts. 1ºs: W=1,U=1,V=0 ; entre W e U: 2ºs 0=0 ; 3ºs 1=1 -> empate total
    expect(byName(ranked, 'V').pos).toBe(3)
    expect(byName(ranked, 'W').pos).toBe(1)
    expect(byName(ranked, 'U').pos).toBe(1) // empate absoluto partilha o lugar
  })

  it('desempate 3: mais 2.os lugares quando pontos, provas e 1.os são iguais', () => {
    // M3: 2.º (13) + 9.º (5) = 18 ; M4: 3.º (11) + 7.º (7) = 18 ; ambos 2 provas e 0 vitórias
    const ranked = mk([
      { code: 'P1', rows: [row({ pos: 2, dorsal: '1', name: 'M3' }), row({ pos: 3, dorsal: '2', name: 'M4' })] },
      { code: 'P2', rows: [row({ pos: 9, dorsal: '1', name: 'M3' }), row({ pos: 7, dorsal: '2', name: 'M4' })] },
    ])
    expect(byName(ranked, 'M3').total).toBe(18)
    expect(byName(ranked, 'M4').total).toBe(18)
    expect(byName(ranked, 'M3').pos).toBe(1) // M3 tem um 2.º lugar, M4 não
    expect(byName(ranked, 'M4').pos).toBe(2)
  })

  it('desempate 4: mais 3.os lugares quando só isso difere', () => {
    // N1: 3.º (11) + 7.º (7) = 18 ; N2: 5.º (9) + 5.º (9) = 18 ; ambos 2 provas, sem 1.os nem 2.os
    const ranked = mk([
      { code: 'P1', rows: [row({ pos: 3, dorsal: '1', name: 'N1' }), row({ pos: 5, dorsal: '2', name: 'N2' })] },
      { code: 'P2', rows: [row({ pos: 7, dorsal: '1', name: 'N1' }), row({ pos: 5, dorsal: '2', name: 'N2' })] },
    ])
    expect(byName(ranked, 'N1').pos).toBe(1)
    expect(byName(ranked, 'N2').pos).toBe(2)
  })

  it('empate total partilha o lugar e o seguinte salta (1, 2, 2, 4)', () => {
    const ranked = mk([
      {
        code: 'P1',
        rows: [
          row({ pos: 1, dorsal: '1', name: 'A1' }),
          row({ pos: 2, dorsal: '2', name: 'A2' }),
          row({ pos: 2, dorsal: '3', name: 'A3' }),
          row({ pos: 4, dorsal: '4', name: 'A4' }),
        ],
      },
    ])
    expect(ranked.map((a) => [a.name, a.pos]).sort()).toEqual([['A1', 1], ['A2', 2], ['A3', 2], ['A4', 4]])
  })
})

describe('fichas e standings da U.R. Charneca', () => {
  const fichas: FichaLite[] = [
    { id: 'ath-1', name: 'Carlos Teste', birthYear: 1985, isYouth: false, dorsal: '102' },
    { id: 'dep-1', name: 'Filipa Fictícia', birthYear: 2016, isYouth: true }, // sem dorsal: casa por nome
    { id: 'ath-2', name: 'Homónimo Repetido', birthYear: 1990, isYouth: false },
    { id: 'ath-3', name: 'Homonimo Repetido', birthYear: 1991, isYouth: false },
  ]

  it('matchFicha: dorsal da época, nome único sem dorsal; ambíguo ou com outro dorsal não casa', () => {
    expect(matchFicha('102', 'QUALQUER NOME', fichas)?.id).toBe('ath-1')
    expect(matchFicha('999', 'FILIPA FICTICIA', fichas)?.id).toBe('dep-1')
    expect(matchFicha('999', 'HOMONIMO REPETIDO', fichas)).toBeUndefined()
    expect(matchFicha('999', 'CARLOS TESTE', fichas)).toBeUndefined() // a ficha tem outro dorsal
  })

  const stages = [
    {
      code: 'P1',
      competitionId: 901,
      raceId: 'race-1',
      rows: [
        row({ pos: 1, dorsal: '101', name: 'BRUNO EXEMPLO', club: 'OUTRO' }),
        row({ pos: 2, dorsal: '102', name: 'CARLOS TESTE', time: '20:39' }),
        row({ pos: 1, dorsal: '201', name: 'FILIPA FICTICIA', gender: 'F', escalao: 'Sub-12 (F)', escalaoBase: 'Sub-12' }),
        row({ pos: 4, dorsal: '301', name: 'GONCALO DESCONHECIDO', escalao: 'Sub-14 (M)', escalaoBase: 'Sub-14' }),
      ],
    },
    { code: 'P2', competitionId: 902, raceId: 'race-2', rows: [row({ pos: 1, dorsal: '102', name: 'CARLOS TESTE' })] },
  ]
  const ranked = rankAthletes(aggregateAthletes(stages))
  const { standings, unmatched } = buildUrcStandings(ranked, { season: '2026/2027', totalSeasonStages: 13, fichas })

  it('só atletas da U.R. Charneca, no formato TrofeuAthleteStanding', () => {
    expect(standings.map((s) => s.dorsal).sort()).toEqual(['102', '201', '301'])
    const carlos = standings.find((s) => s.dorsal === '102')!
    expect(carlos).toEqual({
      id: 'st-2026/2027-102',
      season: '2026/2027',
      season_status: 'open',
      escalao: 'M35',
      gender: 'M',
      pos: 1, // 13 + 15 = 28 pontos; BRUNO é de outro clube e tem 15, por isso Carlos passa-o
      name: 'Carlos Teste',
      birth_year: 1985,
      team: 'UNIÃO RECREATIVA DA CHARNECA',
      dorsal: '102',
      points_per_stage: { P1: 13, P2: 15 },
      total: 28,
      stages_participated: 2,
      total_season_stages: 13,
      eligible_for_prize: false, // precisa de ceil(0,7 x 13) = 10 provas
      is_urc: true,
      matched_profile_id: 'ath-1',
      is_youth: false,
      stage_results: {
        P1: { pos: 2, points: 13, time: '20:39', competition_id: 901, race_id: 'race-1' },
        P2: { pos: 1, points: 15, competition_id: 902, race_id: 'race-2' },
      },
    })
  })
  it('a posição é calculada contra TODOS os clubes do escalão', () => {
    // sem o atleta de outro clube, Carlos seria 1.º de qualquer forma; com apenas P1, fica 2.º
    const onlyP1 = rankAthletes(aggregateAthletes([stages[0]]))
    const s = buildUrcStandings(onlyP1, { season: '2026/2027', totalSeasonStages: 13, fichas }).standings
    expect(s.find((x) => x.dorsal === '102')!.pos).toBe(2)
  })
  it('jovens: ficha por nome, is_youth e escalão com género', () => {
    const filipa = standings.find((s) => s.dorsal === '201')!
    expect(filipa).toMatchObject({
      escalao: 'Sub-12 (F)', gender: 'F', matched_profile_id: 'dep-1', is_youth: true, birth_year: 2016, name: 'Filipa Ficticia',
    })
  })
  it('sem ficha: birth_year 0, sem matched_profile_id, listado em unmatched; is_youth pelo escalão', () => {
    const gon = standings.find((s) => s.dorsal === '301')!
    expect(gon.birth_year).toBe(0)
    expect(gon.matched_profile_id).toBeUndefined()
    expect(gon.is_youth).toBe(true)
    expect(unmatched).toEqual([{ dorsal: '301', name: 'Goncalo Desconhecido' }])
  })
  it('elegibilidade: >= ceil(0,7 x total) provas', () => {
    expect(minStagesForPrize(13)).toBe(10)
    expect(minStagesForPrize(11)).toBe(8)
    expect(minStagesForPrize(10)).toBe(7)
    const many = Array.from({ length: 10 }, (_, i) => ({
      code: `P${i + 1}`,
      rows: [row({ pos: 1, dorsal: '102', name: 'CARLOS TESTE' })],
    }))
    const r = rankAthletes(aggregateAthletes(many))
    const s = buildUrcStandings(r, { season: '2026/2027', totalSeasonStages: 13, fichas }).standings[0]
    expect(s.stages_participated).toBe(10)
    expect(s.eligible_for_prize).toBe(true)
  })
})

describe('mergeStanding (mantém campos existentes)', () => {
  const fresh = {
    id: 'st-2026/2027-5', season: '2026/2027', season_status: 'open', escalao: 'M35', gender: 'M', pos: 1, name: 'Novo',
    birth_year: 0, team: 'T', points_per_stage: { P1: 15 }, total: 15, stages_participated: 1, total_season_stages: 13,
    eligible_for_prize: false, is_urc: true, is_youth: false,
  } as const
  it('sem existente devolve o novo', () => {
    expect(mergeStanding(undefined, { ...fresh })).toEqual(fresh)
  })
  it('recalculados sobrepõem; birth_year e ficha não recalculáveis ficam como estavam', () => {
    const merged = mergeStanding(
      { birth_year: 1985, matched_profile_id: 'ath-9', is_youth: true, pos: 9, total: 1 },
      { ...fresh },
    )
    expect(merged).toMatchObject({ pos: 1, total: 15, birth_year: 1985, matched_profile_id: 'ath-9', is_youth: true })
  })
})

// ---------------------------------------------------------------------------
// Coletiva
// ---------------------------------------------------------------------------

describe('computeClubStandings (total coletivo acumulado)', () => {
  const club = (pos: number, name: string, points: number): ClubRow => ({ pos, sigla: name.slice(0, 3), name, athletes: 10, points })
  const p1 = [club(1, 'Alfa', 100), club(2, 'UNIÃO RECREATIVA DA CHARNECA', 80), club(3, 'Gama', 60)]
  const p2 = [club(1, 'Gama', 120), club(2, 'Alfa', 70), club(3, 'UNIÃO RECREATIVA DA CHARNECA', 65), club(4, 'Delta', 5)]

  it('soma por clube ao longo das provas, ordena e marca a U.R. Charneca', () => {
    const st = computeClubStandings([{ code: 'P1', rows: p1 }, { code: 'P2', rows: p2 }], '2026/2027')
    expect(st.map((c) => [c.pos, c.team, c.total])).toEqual([
      [1, 'Gama', 180],
      [2, 'Alfa', 170],
      [3, 'UNIÃO RECREATIVA DA CHARNECA', 145],
      [4, 'Delta', 5],
    ])
    const urc = st[2]
    expect(urc).toEqual({
      season: '2026/2027',
      pos: 3,
      team: 'UNIÃO RECREATIVA DA CHARNECA',
      points_per_stage: { P1: 80, P2: 65 },
      total: 145,
      is_urc: true,
    })
    expect(st.filter((c) => c.is_urc)).toHaveLength(1)
  })
  it('empate de pontos: mais provas e depois melhor posição na última prova', () => {
    const st = computeClubStandings(
      [
        { code: 'P1', rows: [club(1, 'Um', 50), club(2, 'Dois', 50)] },
        { code: 'P2', rows: [club(1, 'Dois', 10)] },
      ],
      '2026/2027',
    )
    // Dois: 60 (2 provas); Um: 50
    expect(st.map((c) => c.team)).toEqual(['Dois', 'Um'])
    const tie = computeClubStandings([{ code: 'P1', rows: [club(2, 'B', 40), club(1, 'A', 40)] }], '2026/2027')
    expect(tie.map((c) => c.team)).toEqual(['A', 'B'])
  })
  it('chave por nome normalizado (acentos/maiúsculas não duplicam clubes)', () => {
    const st = computeClubStandings(
      [
        { code: 'P1', rows: [club(1, 'Associação Exemplo', 10)] },
        { code: 'P2', rows: [club(1, 'ASSOCIACAO EXEMPLO', 12)] },
      ],
      '2026/2027',
    )
    expect(st).toHaveLength(1)
    expect(st[0].total).toBe(22)
  })
})

describe('regressão sintética: o total coletivo é a soma dos pontos individuais', () => {
  // Três provas com números inventados; a lógica espelha o site real (a coletiva de cada
  // prova = soma dos pontos individuais dos atletas de cada clube).
  const mkRows = (n: number, club: string, startPos: number, esc = 'M35'): ClassificationRow[] =>
    Array.from({ length: n }, (_, i) =>
      row({ pos: startPos + i, dorsal: `${club.slice(0, 1)}${startPos + i}`, name: `ATLETA ${club} ${startPos + i}`, club, escalao: esc, escalaoBase: esc }),
    )

  it('reproduz o total da coletiva por prova e acumulado, e valida com crossCheckUrc', () => {
    // prova: 12 atletas no M35: lugares 1..12 distribuídos por 3 clubes
    const rows: ClassificationRow[] = [
      ...mkRows(4, 'AAA', 1), // lugares 1-4: 15+13+11+10 = 49
      ...mkRows(4, URC, 5), // lugares 5-8: 9+8+7+6 = 30
      ...mkRows(4, 'BBB', 9), // lugares 9-12: 5+4+3+3 = 15
    ]
    const collective: ClubRow[] = [
      { pos: 1, sigla: 'AAA', name: 'Clube AAA', athletes: 4, points: 49 },
      { pos: 2, sigla: URC, name: 'UNIÃO RECREATIVA DA CHARNECA', athletes: 4, points: 30 },
      { pos: 3, sigla: 'BBB', name: 'Clube BBB', athletes: 4, points: 15 },
    ]
    expect(crossCheckUrc(rows, collective)).toBeNull()
    expect(crossCheckUrc(rows, [{ ...collective[1], points: 31 }])).toEqual({ individual: 30, collective: 31 })

    const st = computeClubStandings(
      [
        { code: 'P1', rows: collective },
        { code: 'P2', rows: collective },
        { code: 'P3', rows: collective },
      ],
      '2026/2027',
    )
    const urc = st.find((c) => c.is_urc)!
    expect(urc.pos).toBe(2)
    expect(urc.total).toBe(90)
    expect(urc.points_per_stage).toEqual({ P1: 30, P2: 30, P3: 30 })

    const stageInputs = ['P1', 'P2', 'P3'].map((code) => ({ code, rows }))
    const standings = buildUrcStandings(rankAthletes(aggregateAthletes(stageInputs)), {
      season: '2026/2027',
      totalSeasonStages: 3,
      fichas: [],
    }).standings
    expect(standings).toHaveLength(4)
    expect(standings.reduce((s, a) => s + a.total, 0)).toBe(urc.total) // soma individual = total coletivo
    expect(standings.every((a) => a.eligible_for_prize && a.stages_participated === 3)).toBe(true)
    expect(standings.map((a) => a.pos)).toEqual([5, 6, 7, 8]) // 5.º a 8.º lugar do escalão
  })
})

// ---------------------------------------------------------------------------
// Datas e descoberta de ids
// ---------------------------------------------------------------------------

describe('época e datas', () => {
  it('seasonStartYear e isDateInSeason (1 ago - 31 jul)', () => {
    expect(seasonStartYear('2026/2027')).toBe(2026)
    expect(seasonStartYear('2026')).toBeNull()
    expect(isDateInSeason('2026-11-22', '2026/2027')).toBe(true)
    expect(isDateInSeason('2027-07-31', '2026/2027')).toBe(true)
    expect(isDateInSeason('2027-08-01', '2026/2027')).toBe(false)
    expect(isDateInSeason('2026-06-14', '2026/2027')).toBe(false)
  })
  it('todayLisbon usa o dia de Lisboa', () => {
    expect(todayLisbon(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-22')
    expect(todayLisbon(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02') // WEST = UTC+1
  })
})

describe('matchCompetitionsToRaces (por data)', () => {
  const races = [
    { id: 'r2', date: '2026-12-08', title: '2ª Etapa Troféu — Corrida da Padroeira' },
    { id: 'r3', date: '2027-01-10', title: '3ª Etapa Troféu — Corta-Mato do Exemplo' },
  ]
  const info = (title: string, date: string) => ({ title, date })
  it('associa pela data', () => {
    const r = matchCompetitionsToRaces(races, [
      { id: 930, info: info('Outra coisa', '2026-12-01') },
      { id: 931, info: info('CORRIDA DA PADROEIRA', '2026-12-08') },
    ])
    expect(r.matches).toEqual([{ raceId: 'r2', competitionId: 931 }])
    expect(r.ambiguous).toEqual([])
  })
  it('mesma data com várias competições: desempata pelo título; senão fica ambíguo', () => {
    const tie = matchCompetitionsToRaces(races, [
      { id: 940, info: info('Torneio de Xadrez', '2026-12-08') },
      { id: 941, info: info('Corrida da Padroeira 2026', '2026-12-08') },
    ])
    expect(tie.matches).toEqual([{ raceId: 'r2', competitionId: 941 }])
    const amb = matchCompetitionsToRaces(races, [
      { id: 950, info: info('Prova A', '2026-12-08') },
      { id: 951, info: info('Prova B', '2026-12-08') },
    ])
    expect(amb.matches).toEqual([])
    expect(amb.ambiguous).toEqual(['r2'])
  })
  it('não reutiliza ids já atribuídos a outras provas', () => {
    const r = matchCompetitionsToRaces(races, [{ id: 960, info: info('Qualquer', '2026-12-08') }], new Set([960]))
    expect(r.matches).toEqual([])
  })
})
