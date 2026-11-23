import type { Race } from '../types'

/**
 * Histórico das provas do Troféu de Atletismo de Cascais, recolhido do calendário público de
 * trofeuatletismocascais.pt (/Competicoes/<id>). Só dados das provas (data, hora, local, ligação oficial):
 * sem nomes de atletas. Gerado por script; as épocas 2022/2023 a 2025/2026 estão completas e a de
 * 2021/2022 só inclui as provas que o site ainda mostra.
 */
/** Época de uma data: de agosto a julho */
const season = (date: string) => {
  const y = Number(date.slice(0, 4))
  const start = Number(date.slice(5, 7)) >= 8 ? y : y - 1
  return `${start}/${start + 1}`
}

const hist = (
  cid: number,
  title: string,
  date: string,
  time: string,
  location: string,
  stage: number
): Race => ({
  id: `trofeu-hist-${cid}`,
  title,
  category: 'trofeu_cascais',
  date,
  start_time: time,
  location,
  distances: [],
  description: `Etapa do Troféu de Atletismo de Cascais (época ${season(date)}). Resultados e classificações no site oficial do Troféu.`,
  external_url: `https://trofeuatletismocascais.pt/Competicoes/${cid}`,
  van_available: false,
  van_capacity: 0,
  vehicles: [],
  counts_for_trophy: true,
  trophy_stage_number: stage,
  trofeu_competition_id: cid,
  created_by: 'system-trofeu-sync',
  created_by_name: 'Calendário oficial do Troféu',
})

export const TROFEU_HISTORY_RACES: Race[] = [
  // Época 2021/2022
  hist(365, "4ª Corrida CCD Cascais", '2022-04-03', '09:00', "Cascais", 1),
  hist(366, "10º Corta Mato do Naza", '2022-04-10', '09:30', "Abóboda", 2),
  hist(367, "9º Corta-Mato da Atibá \"Luis Candeias\"", '2022-05-01', '09:30', "Cascais", 3),
  hist(368, "3ª Grande Prémio de Atletismo dos Galgos", '2022-05-15', '09:30', "Cascais", 4),
  hist(369, "42º Grande Prémio de Atletismo do Desportivo Monte Real", '2022-05-22', '09:30', "São Domingos de Rana", 5),
  hist(370, "5º Grande Prémio de Atletismo do Arneiro \"Alcindo Moreira\"", '2022-05-29', '09:25', "Cascais", 6),
  hist(371, "20.ª Milha Urbana de São Domingos de Rana", '2022-06-12', '09:00', "Abóboda", 7),
  hist(372, "37.ª Corrida da Juventude", '2022-06-19', '09:00', "Bairro de Massapés – São Domingos de Rana", 8),
  hist(373, "7.ª Légua de Janes", '2022-06-26', '09:00', "Janes", 9),
  // Época 2022/2023
  hist(418, "Corrida da Padroeira", '2022-12-18', '09:30', "Cascais", 1),
  hist(429, "5ª Corrida CCD Cascais", '2023-01-08', '09:30', "Cascais", 2),
  hist(435, "9ª Corta Mato do Naza", '2023-01-29', '09:30', "Abóboda", 3),
  hist(440, "43º G.P. Atletismo Desportivo Monte Real", '2023-02-19', '09:30', "Monte Real", 4),
  hist(448, "4.º GP Atletismo Os Galgos", '2023-03-05', '09:30', "Cascais", 5),
  hist(454, "2º Corta-Mato de Bicesse", '2023-03-26', '09:30', "Bicesse", 6),
  hist(456, "XXXVIII Corrida da Juventude", '2023-04-16', '09:30', "Cascais", 7),
  hist(467, "6ª GP Luís Candeias", '2023-05-07', '09:00', "Cascais", 8),
  hist(472, "XXI Milha Urbana de S. Domingos de Rana", '2023-05-21', '09:30', "Cascais", 9),
  hist(478, "GP Atletismo CDA", '2023-05-28', '09:00', "Cascais", 10),
  hist(483, "8ª Légua de Janes", '2023-06-18', '09:30', "Cascais", 11),
  // Época 2023/2024
  hist(510, "Corrida da Padroeira", '2023-12-08', '09:00', "Abóboda", 1),
  hist(515, "10ª Corta Mato do Naza", '2024-01-07', '09:30', "Naza", 2),
  hist(520, "6ª Corrida CCD Cascais", '2024-01-21', '09:30', "Cascais", 3),
  hist(526, "44º G.P. Atletismo Desportivo Monte Real", '2024-02-25', '09:30', "Monte Real", 4),
  hist(537, "5.º GP Atletismo Os Galgos", '2024-03-24', '09:30', "São Domingos de Rana", 5),
  hist(546, "39ª Corrida da Juventude", '2024-04-21', '09:30', "S. Domingos de Rana", 6),
  hist(558, "7º Grande Prémio de Atibá \"luis Candeias\"", '2024-05-05', '09:30', "Cascais", 7),
  hist(568, "XXII Milha Urbana de S. Domingos de Rana", '2024-05-12', '09:30', "São Domingos de Rana", 8),
  hist(572, "7ª GP Atletismo do Arneiro", '2024-05-19', '09:00', "Cascais", 9),
  hist(578, "9ª Légua de Janes", '2024-06-16', '09:30', "Janes", 10),
  // Época 2024/2025
  hist(602, "Corrida da Padroeira", '2024-12-15', '09:30', "Abóboda", 1),
  hist(620, "7ª Corrida CCD Cascais", '2025-01-19', '09:30', "Cascais", 2),
  hist(613, "11ª Corta Mato do Naza", '2025-02-02', '09:00', "Abóboda", 3),
  hist(624, "45º G.P. Atletismo Desportivo Monte Real", '2025-02-23', '09:30', "Cascais", 4),
  hist(634, "6.º GP Atletismo Os Galgos", '2025-03-16', '09:30', "São Domingos de Rana", 5),
  hist(645, "1ª G.P. União Recreativa da Charneca \"António Riscado\"", '2025-03-30', '09:00', "Charneca, Cascais", 6),
  hist(652, "10ª Légua de Janes", '2025-04-13', '09:30', "Janes", 7),
  hist(670, "40ª Corrida da Juventude", '2025-04-25', '09:30', "S. Domingos de Rana", 8),
  hist(675, "23ª Milha Urbana de S. Domingos de Rana", '2025-05-11', '09:30', "São Domingos de Rana", 9),
  hist(691, "8º GRANDE PRÉMIO DE ATIBÁ \"Luis Candeias\"", '2025-06-15', '09:00', "Cascais", 10),
  hist(697, "8ª GP Atletismo do Arneiro", '2025-06-22', '09:00', "Cascais", 11),
  // Época 2025/2026
  hist(727, "Corrida da Padroeira", '2025-12-08', '09:30', "Abóboda", 1),
  hist(734, "12ª Corta Mato do Naza", '2026-01-11', '09:00', "Cascais", 2),
  hist(756, "8ª Corrida CCD Cascais", '2026-01-25', '09:00', "Cascais", 3),
  hist(764, "46º G.P. Atletismo Desportivo Monte Real", '2026-02-22', '09:30', "Cascais", 4),
  hist(794, "7.º GP Atletismo Os Galgos", '2026-03-15', '09:30', "Cascais", 5),
  hist(803, "2º Grande Prémio de Atletismo da Charneca \"António Riscado\"", '2026-03-29', '09:30', "Cascais", 6),
  hist(804, "11ª Légua de Janes", '2026-04-19', '09:30', "Janes", 7),
  hist(805, "41ª Corrida da Juventude", '2026-04-25', '09:30', "S. Domingos de Rana", 8),
  hist(806, "24ª Milha Urbana de S. Domingos de Rana", '2026-05-10', '09:30', "S. Domingos de Rana", 9),
  hist(807, "9* Grande Prémio de Atletismo do Clube Desportivo do Arneiro \"Alcindo Moreira\"", '2026-05-17', '09:30', "Zona da Abóboda", 10),
  hist(808, "9º GRANDE PRÉMIO DE ATIBÁ \"Luis Candeias\"", '2026-06-14', '09:30', "Atibá", 11),
]
