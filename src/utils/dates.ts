/** Data de hoje no formato YYYY-MM-DD (hora local). */
export const todayISO = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Época do Troféu de uma data: de agosto a julho (ex.: 2026-11-22 → 2026/2027). */
export const seasonOf = (date: string): string => {
  const y = Number(date.slice(0, 4))
  const start = Number(date.slice(5, 7)) >= 8 ? y : y - 1
  return `${start}/${start + 1}`
}
