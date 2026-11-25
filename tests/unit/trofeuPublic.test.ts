import { describe, expect, it } from 'vitest'
import {
  aggregateAthletes,
  buildGeneralStandings,
  buildStageAthletes,
  buildStageClubs,
  rankAthletes,
  type ClassificationRow,
} from '../../supabase/functions/trofeu-sync/parse'

// Dados inventados
const row = (p: Partial<ClassificationRow>): ClassificationRow => ({
  pos: 1, dorsal: '1', name: 'ANA EXEMPLO', club: 'U R CHARNECA', escalaoBase: 'M35', gender: 'F', escalao: 'M35', points: 15, ...p,
})

describe('classificações completas (sem dados a mais)', () => {
  it('prova: nomes em título, clube da equipa marcado, sem dorsal', () => {
    const out = buildStageAthletes([
      row({ pos: 2, dorsal: '9', name: 'RUI DA SILVA', club: 'OUTRO CLUBE', gender: 'M', escalao: 'Seniores (M)', points: 13, time: '00:40:01' }),
      row({}),
    ])
    expect(out[0]).toEqual({ pos: 1, name: 'Ana Exemplo', club: 'U R CHARNECA', escalao: 'M35', gender: 'F', points: 15, urc: true })
    expect(out[1]).toMatchObject({ name: 'Rui da Silva', urc: false, time: '00:40:01' })
    expect(JSON.stringify(out)).not.toContain('dorsal')
  })

  it('clubes por lugar', () => {
    const out = buildStageClubs([
      { pos: 2, sigla: 'U R CHARNECA', name: 'UNIÃO RECREATIVA DA CHARNECA', athletes: 40, points: 300 },
      { pos: 1, sigla: 'XPTO', name: 'CLUBE XPTO', athletes: 60, points: 500 },
    ])
    expect(out.map((c) => [c.pos, c.urc])).toEqual([[1, false], [2, true]])
  })

  it('geral: pontos por etapa e total, sem dorsal nem ano', () => {
    const ranked = rankAthletes(
      aggregateAthletes([
        { code: 'P1', rows: [row({}), row({ pos: 2, dorsal: '2', name: 'BIA TESTE', club: 'XPTO', points: 13 })] },
        { code: 'P2', rows: [row({ pos: 3, points: 11 })] },
      ]),
    )
    const out = buildGeneralStandings(ranked)
    expect(out[0]).toEqual({ pos: 1, name: 'Ana Exemplo', club: 'U R CHARNECA', escalao: 'M35', gender: 'F', total: 26, stages: 2, pts: { P1: 15, P2: 11 }, urc: true })
    expect(out[1]).toMatchObject({ pos: 2, name: 'Bia Teste', total: 13, urc: false })
    expect(JSON.stringify(out)).not.toMatch(/dorsal|birth/)
  })
})
