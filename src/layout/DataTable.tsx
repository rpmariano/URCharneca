import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  id: string
  header: string
  /** Valor usado na ordenação; sem ele a coluna não é ordenável. */
  sortValue?: (row: T) => string | number
  render: (row: T) => React.ReactNode
  className?: string
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Legenda da tabela (lida por leitores de ecrã; visível se `showCaption`). */
  caption: string
  showCaption?: boolean
  rowLabel: (row: T) => string
  loading?: boolean
  empty?: React.ReactNode
  selectable?: boolean
  selected?: Set<string>
  onSelectedChange?: (s: Set<string>) => void
  onRowOpen?: (row: T) => void
  initialSort?: { id: string; dir: 'asc' | 'desc' }
}

/** Tabela densa e acessível: cabeçalhos `<th scope>`, ordenação por coluna, seleção múltipla. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  showCaption,
  rowLabel,
  loading,
  empty,
  selectable,
  selected,
  onSelectedChange,
  onRowOpen,
  initialSort,
}: Props<T>) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.id)
    if (!sort || !col?.sortValue) return rows
    const f = col.sortValue
    const m = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = f(a)
      const y = f(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt')) * m
    })
  }, [rows, columns, sort])

  const keys = sorted.map(rowKey)
  const sel = selected ?? new Set<string>()
  const allSelected = keys.length > 0 && keys.every((k) => sel.has(k))
  const someSelected = keys.some((k) => sel.has(k))

  const toggle = (k: string) => {
    const next = new Set(sel)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onSelectedChange?.(next)
  }
  const toggleAll = () => {
    const next = new Set(sel)
    if (allSelected) keys.forEach((k) => next.delete(k))
    else keys.forEach((k) => next.add(k))
    onSelectedChange?.(next)
  }

  return (
    <div className="desk-table-wrap">
      <table className="desk-table">
        <caption className={showCaption ? 'desk-caption' : 'sr-only'}>{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="desk-th-check">
                <input
                  type="checkbox"
                  className="desk-check"
                  aria-label="Selecionar todas as linhas visíveis"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected
                  }}
                  onChange={toggleAll}
                  disabled={keys.length === 0}
                />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.id === c.id
              return (
                <th
                  key={c.id}
                  scope="col"
                  className={c.className}
                  aria-sort={c.sortValue ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      className="desk-sort"
                      onClick={() => setSort(active && sort!.dir === 'asc' ? { id: c.id, dir: 'desc' } : { id: c.id, dir: 'asc' })}
                    >
                      {c.header}
                      {active ? (
                        sort!.dir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="desk-state" role="status">
                A carregar…
              </td>
            </tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="desk-state">
                {empty ?? 'Sem resultados.'}
              </td>
            </tr>
          )}
          {!loading &&
            sorted.map((row) => {
              const k = rowKey(row)
              const isSel = sel.has(k)
              return (
                <tr key={k} className={isSel ? 'is-selected' : undefined}>
                  {selectable && (
                    <td className="desk-th-check">
                      <input
                        type="checkbox"
                        className="desk-check"
                        aria-label={`Selecionar ${rowLabel(row)}`}
                        checked={isSel}
                        onChange={() => toggle(k)}
                      />
                    </td>
                  )}
                  {columns.map((c, i) => (
                    <td key={c.id} className={c.className}>
                      {i === 0 && onRowOpen ? (
                        <button type="button" className="desk-rowlink" onClick={() => onRowOpen(row)}>
                          {c.render(row)}
                        </button>
                      ) : (
                        c.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
