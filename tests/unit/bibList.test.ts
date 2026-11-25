import { describe, expect, it } from 'vitest'
import type { AthleteProfile, Race, RaceRegistration, YouthAthlete } from '../../src/types'
import { buildBibListPdf, buildBibRows } from '../../src/utils/bibList'
import { toWinAnsi, wrapText } from '../../src/utils/pdf'

// Dados inventados: o repositório é público
const race = { id: 'r1', title: 'Corrida de Teste', category: 'trofeu_cascais', date: '2026-12-06', start_time: '10:00', location: 'Cascais' } as Race

const profiles = [
  { id: 'a1', name: 'Zélia Exemplo', birth_date: '1980-03-09', dorsais_trofeu: { '2026/2027': '501', '2025/2026': '77' } },
  { id: 'a2', name: 'Álvaro Exemplo', birth_date: '1975-11-30' },
] as unknown as AthleteProfile[]

const youth = [{ id: 'c1', name: 'Beatriz Exemplo', birth_date: '2016-01-02' }] as unknown as YouthAthlete[]

const reg = (patch: Partial<RaceRegistration>): RaceRegistration =>
  ({ id: Math.random().toString(), race_id: 'r1', athlete_name: 'Sem Ficha', is_dependent: false, status: 'enrolled_by_admin', ...patch }) as RaceRegistration

describe('buildBibRows', () => {
  it('só inclui inscrições confirmadas desta prova', () => {
    const rows = buildBibRows(
      race,
      [
        reg({ athlete_id: 'a1' }),
        reg({ athlete_id: 'a2', status: 'interested' }),
        reg({ athlete_id: 'a2', status: 'cancelled' }),
        reg({ athlete_id: 'a2', status: 'self_enrolled' }),
        reg({ athlete_id: 'a2', race_id: 'outra' }),
      ],
      profiles,
      youth
    )
    expect(rows.map((r) => r.name)).toEqual(['Zélia Exemplo'])
  })

  it('ordena por nome e usa a ficha da criança, não a do adulto', () => {
    const rows = buildBibRows(
      race,
      [reg({ athlete_id: 'a1' }), reg({ athlete_id: 'a1', is_dependent: true, dependent_id: 'c1' }), reg({ athlete_id: 'a2' })],
      profiles,
      youth
    )
    expect(rows.map((r) => [r.name, r.birthDate])).toEqual([
      ['Álvaro Exemplo', '1975-11-30'],
      ['Beatriz Exemplo', '2016-01-02'],
      ['Zélia Exemplo', '1980-03-09'],
    ])
  })

  it('não inventa a data de uma criança sem ficha', () => {
    const [row] = buildBibRows(race, [reg({ athlete_id: 'a1', is_dependent: true, dependent_id: 'x', athlete_name: 'Criança' })], profiles, youth)
    expect(row).toEqual({ name: 'Criança', birthDate: '', bib: '' })
  })

  it('o número da inscrição prevalece sobre o dorsal da época', () => {
    expect(buildBibRows(race, [reg({ athlete_id: 'a1', bib_number: '12' })], profiles, youth)[0].bib).toBe('12')
    expect(buildBibRows(race, [reg({ athlete_id: 'a1' })], profiles, youth)[0].bib).toBe('501')
  })

  it('fora do Troféu não usa o dorsal da época', () => {
    expect(buildBibRows({ ...race, category: 'equipa' }, [reg({ athlete_id: 'a1' })], profiles, youth)[0].bib).toBe('')
  })
})

describe('PDF', () => {
  const asText = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('')

  it('gera um PDF com acentos, datas em português e posições xref corretas', () => {
    const pdf = asText(buildBibListPdf(race, [{ name: 'João (Jo) Conceição', birthDate: '1990-07-04', bib: '33' }], '2026-12-01'))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('(João \\(Jo\\) Conceição)')
    expect(pdf).toContain('(04/07/1990)')
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1])
    expect(pdf.slice(xref, xref + 4)).toBe('xref')
    const offsets = [...pdf.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]))
    offsets.forEach((o, i) => expect(pdf.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true))
  })

  it('passa para várias páginas e repete o cabeçalho', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ name: `Atleta ${i}`, birthDate: '', bib: '' }))
    const pdf = asText(buildBibListPdf(race, rows))
    const pages = Number(pdf.match(/\/Count (\d+)/)![1])
    expect(pages).toBeGreaterThan(1)
    expect(pdf.match(/\(Data de nascimento\)/g)).toHaveLength(pages)
    expect(pdf).toContain('(Atleta 59)')
    expect(pdf).toContain('(em falta)')
  })

  it('converte o que a fonte não tem e parte nomes compridos', () => {
    expect(toWinAnsi('Ștefan Łukasz')).toBe('Stefan ?ukasz')
    const lines = wrapText('Maria Antonieta da Conceição Vasconcelos de Albuquerque e Sousa Figueiredo', 250, 11)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toContain('Figueiredo')
  })
})
