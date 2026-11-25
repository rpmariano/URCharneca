import type { AthleteProfile, Race, RaceRegistration, YouthAthlete } from '../types'
import { seasonOf, todayISO } from './dates'
import { tidyText } from './display'
import { buildTablePdf, PDF_CONTENT_WIDTH } from './pdf'

/** Uma linha da lista de levantamento de dorsais. Campos vazios = dado que ainda não existe. */
export interface BibRow {
  name: string
  birthDate: string
  bib: string
}

const ptDate = (iso: string) => iso.split('-').reverse().join('/')

/**
 * Atletas e crianças com a inscrição confirmada pelo clube nesta prova, por ordem alfabética.
 * Pedidos por confirmar e inscrições canceladas ficam de fora.
 * No Troféu, sem número na inscrição, usa-se o dorsal da época que está na ficha.
 */
export function buildBibRows(
  race: Race,
  registrations: RaceRegistration[],
  profiles: AthleteProfile[],
  youth: YouthAthlete[]
): BibRow[] {
  const season = seasonOf(race.date)
  return registrations
    .filter((r) => r.race_id === race.id && r.status === 'enrolled_by_admin')
    .map((r) => {
      // Numa inscrição de dependente nunca se cai na ficha do adulto: daria a data de nascimento errada
      const person = r.is_dependent
        ? youth.find((c) => c.id === (r.dependent_id || r.athlete_id))
        : profiles.find((p) => p.id === r.athlete_id) ?? youth.find((c) => c.id === r.athlete_id)
      const seasonBib =
        race.category === 'trofeu_cascais'
          ? person?.dorsais_trofeu?.[season] || (season === '2026/2027' ? person?.dorsal_trofeu : undefined)
          : undefined
      return {
        name: person?.name || r.athlete_name,
        birthDate: person?.birth_date ?? '',
        bib: r.bib_number || seasonBib || '',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}

export function buildBibListPdf(race: Race, rows: BibRow[], today = todayISO()): Uint8Array<ArrayBuffer> {
  return buildTablePdf({
    title: tidyText(race.title),
    subtitle: [
      'U.R. Charneca · Levantamento de dorsais da equipa',
      `Prova: ${ptDate(race.date)}, ${race.start_time} · ${tidyText(race.location)}`,
      ...(race.bib_pickup_info ? [`Dorsais: ${tidyText(race.bib_pickup_info)}`] : []),
      `${rows.length} ${rows.length === 1 ? 'atleta com inscrição confirmada' : 'atletas com inscrição confirmada'}`,
    ],
    columns: [
      { label: 'N.º', width: 32 },
      { label: 'Nome', width: PDF_CONTENT_WIDTH - 32 - 115 - 65 },
      { label: 'Data de nascimento', width: 115 },
      { label: 'Dorsal', width: 65, align: 'right' },
    ],
    rows: rows.map((r, i) => [String(i + 1), r.name, r.birthDate ? ptDate(r.birthDate) : 'em falta', r.bib]),
    footer: `Gerado em ${ptDate(today)}. Contém dados pessoais: usar só para levantar os dorsais.`,
  })
}
