import { describe, expect, it } from 'vitest'
import { countSeasonStages, plural } from '../../src/utils/formatters'
import { TROFEU_HISTORY_RACES } from '../../src/data/trofeuHistory'
import { buildTrofeuRaces2026_2027 } from '../../src/data/trofeuData'

describe('countSeasonStages', () => {
  it('conta só as etapas da época pedida, sem o histórico', () => {
    const current = buildTrofeuRaces2026_2027('2026-11-22T09:00:00Z')
    const old = { ...current[0], id: 'etapa-antiga', date: '2025-11-23' }
    expect(countSeasonStages([...current, old, ...TROFEU_HISTORY_RACES], '2026/2027')).toBe(13)
  })
})

describe('plural', () => {
  it('só usa o singular para 1', () => {
    expect([0, 1, 2].map((n) => plural(n, 'atleta', 'atletas'))).toEqual(['atletas', 'atleta', 'atletas'])
  })
})
