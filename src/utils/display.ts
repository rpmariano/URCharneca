/**
 * Formatação só de apresentação (não altera dados nem ids).
 * A interface não usa travessões: os textos vindos dos dados com " — " mostram-se com vírgula, e os títulos
 * das etapas do Troféu ("1ª Etapa Troféu — 1º GP ...") separam o número da etapa do nome da prova.
 */
import type { Race } from '../types'

/** Troca travessões por vírgulas ("Bairro Irene — Alcabideche" -> "Bairro Irene, Alcabideche"). */
export const tidyText = (s: string | undefined | null): string =>
  (s ?? '')
    .replace(/\s*—\s*$/g, '')
    .replace(/\s+—\s+/g, ', ')
    .replace(/—/g, '-')

const STAGE_TITLE = /^\s*(\d+)\s*[ªº.]?\s*etapa\s+(?:do\s+)?trof[eé]u\s*[—–:-]?\s*/i

/** Número da etapa do Troféu (se houver) e nome da prova sem o prefixo "Nª Etapa Troféu —". */
export const raceTitleParts = (race: Pick<Race, 'title' | 'trophy_stage_number' | 'category'>): { stage?: number; name: string } => {
  const m = race.title.match(STAGE_TITLE)
  const stage = race.trophy_stage_number ?? (m ? Number(m[1]) : undefined)
  const name = tidyText(m ? race.title.slice(m[0].length) : race.title) || tidyText(race.title)
  return { stage: race.category === 'trofeu_cascais' || m ? stage : undefined, name }
}

/** Título numa só linha: "Etapa 2, Corrida da Padroeira" ou o nome da prova. */
export const raceDisplayTitle = (race: Pick<Race, 'title' | 'trophy_stage_number' | 'category'>): string => {
  const { stage, name } = raceTitleParts(race)
  return stage ? `Etapa ${stage}, ${name}` : name
}
