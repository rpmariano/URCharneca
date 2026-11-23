import { describe, expect, it } from 'vitest'
import {
  calculateDeadlineISO,
  calculateTrofeuPoints,
  getCollectivePrizeEur,
  getTrofeuEscalao2026,
  mapTrofeuEscalaoToApp,
} from '../../src/data/trofeuData'

describe('calculateTrofeuPoints', () => {
  it('tabela oficial 1.º a 10.º', () => {
    const expected = [15, 13, 11, 10, 9, 8, 7, 6, 5, 4]
    expected.forEach((pts, i) => expect(calculateTrofeuPoints(i + 1)).toBe(pts))
  })
  it('escalas 11-20 (3), 21-30 (2), 31+ (1)', () => {
    expect(calculateTrofeuPoints(11)).toBe(3)
    expect(calculateTrofeuPoints(20)).toBe(3)
    expect(calculateTrofeuPoints(21)).toBe(2)
    expect(calculateTrofeuPoints(30)).toBe(2)
    expect(calculateTrofeuPoints(31)).toBe(1)
    expect(calculateTrofeuPoints(500)).toBe(1)
  })
  it('lugar invalido (0 ou negativo) vale 0', () => {
    expect(calculateTrofeuPoints(0)).toBe(0)
    expect(calculateTrofeuPoints(-4)).toBe(0)
  })
  it('e monotona nao crescente', () => {
    for (let p = 1; p < 60; p++) expect(calculateTrofeuPoints(p + 1)).toBeLessThanOrEqual(calculateTrofeuPoints(p))
  })
})

describe('getTrofeuEscalao2026', () => {
  it.each([
    [2017, 'M', 'Sub-12'],
    [2016, 'F', 'Sub-12'],
    [2015, 'M', 'Sub-14'],
    [2014, 'F', 'Sub-14'],
    [2013, 'M', 'Sub-16'],
    [2011, 'F', 'Sub-18'],
    [2009, 'M', 'Sub-20'],
    [2007, 'M', 'Sub-23 M'],
    [2005, 'F', 'Sub-23 F'],
    [2004, 'M', 'Seniores M'],
    [1993, 'F', 'Seniores F'],
    [1992, 'M', 'M35'],
    [1988, 'F', 'F35'],
    [1987, 'M', 'M40'],
    [1982, 'F', 'F45'],
    [1977, 'M', 'M50'],
    [1972, 'F', 'F55'],
    [1967, 'M', 'M60'],
    [1962, 'F', 'F65'],
    [1957, 'M', 'M70'],
    [1952, 'M', 'M75'],
    [1947, 'M', 'M80'],
  ] as const)('%i %s -> %s', (year, gender, esc) => {
    expect(getTrofeuEscalao2026(year, gender)).toBe(esc)
  })
  it('senhoras com 65+ anos ficam em F70 (nao existe F75/F80)', () => {
    expect(getTrofeuEscalao2026(1957, 'F')).toBe('F70')
    expect(getTrofeuEscalao2026(1940, 'F')).toBe('F70')
  })
  it('fronteiras: cada escalao comeca no ano certo', () => {
    // ultimo ano do escalao anterior vs primeiro do seguinte
    expect(getTrofeuEscalao2026(2004, 'M')).not.toBe(getTrofeuEscalao2026(2005, 'M'))
    expect(getTrofeuEscalao2026(1962, 'M')).toBe('M65')
    expect(getTrofeuEscalao2026(1963, 'M')).toBe('M60')
  })
})

describe('mapTrofeuEscalaoToApp', () => {
  it.each([
    ['Sub-12', 'M', 'Benjamins B (Sub-12)'],
    ['Sub-14', 'F', 'Infantis (Sub-14)'],
    ['Sub-16', 'M', 'Iniciados (Sub-16)'],
    ['Sub-18', 'F', 'Juvenis (Sub-18)'],
    ['Sub-20', 'M', 'Juniores (Sub-20)'],
    ['Sub-23 M', 'M', 'Sub-23 M'],
    ['Sub-23', 'F', 'Sub-23 F'],
    ['Seniores F', 'F', 'Seniores F'],
    ['Seniores', 'M', 'Seniores M'],
    ['M35', 'M', 'Veteranos M35'],
    ['F40', 'F', 'Veteranos F40'],
    ['M55', 'M', 'Veteranos M55'],
    ['M60', 'M', 'Veteranos M60+'],
    ['F70', 'F', 'Veteranos F60+'],
    ['M80', 'M', 'Veteranos M60+'],
  ] as const)('%s (%s) -> %s', (esc, gender, expected) => {
    expect(mapTrofeuEscalaoToApp(esc, gender)).toBe(expected)
  })
  it('ignora sufixo (Masculino)/(Feminino)', () => {
    expect(mapTrofeuEscalaoToApp('Sub-14 (Masculino)', 'M')).toBe('Infantis (Sub-14)')
    expect(mapTrofeuEscalaoToApp('F45 (Feminino)', 'F')).toBe('Veteranos F45')
  })
  it('composicao: todo escalao calculado tem correspondencia na app para ambos os generos', () => {
    for (let year = 1930; year <= 2020; year++) {
      for (const g of ['M', 'F'] as const) {
        const app = mapTrofeuEscalaoToApp(getTrofeuEscalao2026(year, g), g)
        expect(app).toBeTruthy()
        // genero M nunca deve cair num escalao feminino e vice-versa (nos escaloes com genero no nome)
        if (/ F\b|F\d\d/.test(app)) expect(g).toBe('F')
        if (/ M\b|M\d\d/.test(app)) expect(g).toBe('M')
      }
    }
  })
})

describe('calculateDeadlineISO (3.º dia util anterior)', () => {
  it('prova ao domingo: prazo na quarta-feira anterior', () => {
    expect(calculateDeadlineISO('2026-12-06')).toBe('2026-12-02') // dom -> qua
  })
  it('prova ao sabado: prazo na quarta-feira', () => {
    expect(calculateDeadlineISO('2026-12-05')).toBe('2026-12-02')
  })
  it('prova a segunda: salta o fim de semana', () => {
    expect(calculateDeadlineISO('2026-12-07')).toBe('2026-12-02')
  })
  it('prova a quarta: prazo na sexta da semana anterior', () => {
    expect(calculateDeadlineISO('2026-12-09')).toBe('2026-12-04') // ter 8, seg 7, sex 4
  })
  it('atravessa viragem de mes e de ano', () => {
    expect(calculateDeadlineISO('2027-01-03')).toBe('2026-12-30') // dom -> qua
    expect(calculateDeadlineISO('2026-03-01')).toBe('2026-02-25') // dom -> qua
  })
  it('devolve sempre dia util', () => {
    for (let d = 1; d <= 28; d++) {
      const iso = `2026-11-${String(d).padStart(2, '0')}`
      const [y, m, day] = calculateDeadlineISO(iso).split('-').map(Number)
      const dow = new Date(y, m - 1, day).getDay()
      expect([0, 6]).not.toContain(dow)
    }
  })
})

describe('getCollectivePrizeEur', () => {
  it('posicao invalida vale 0 e posicoes fora da tabela tem valor base', () => {
    expect(getCollectivePrizeEur(0)).toBe(0)
    expect(getCollectivePrizeEur(999)).toBeGreaterThan(0)
  })
})
