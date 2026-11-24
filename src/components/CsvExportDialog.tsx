import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Sheet } from './Sheet'
import { Button, SheetHeader } from './ui'

/** Um campo exportável: texto do cabeçalho e valor (já em texto) de cada linha. */
export interface CsvField<T> {
  id: string
  label: string
  get: (row: T) => string
}

interface Props<T> {
  title: string
  /** Linhas a exportar (as selecionadas na tabela, ou todas as visíveis). */
  rows: T[]
  /** Nome do ficheiro sem extensão */
  filename: string
  /** Campos que já aparecem como colunas da tabela (vêm marcados). */
  tableFields: CsvField<T>[]
  /** Restantes dados da ficha (vêm desmarcados). */
  extraFields: CsvField<T>[]
  rowLabel: (row: T) => string
  onClose: () => void
  onDone?: () => void
}

const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`

/**
 * Janela de exportação CSV: mostra o que vai ser exportado (as linhas selecionadas na tabela, com as colunas da tabela
 * marcadas) e permite acrescentar os restantes dados das fichas. Separador `;` e UTF-8 com BOM (abre bem no Excel).
 */
export function CsvExportDialog<T>({ title, rows, filename, tableFields, extraFields, rowLabel, onClose, onDone }: Props<T>) {
  const [on, setOn] = useState<Set<string>>(() => new Set(tableFields.map((f) => f.id)))
  const all = useMemo(() => [...tableFields, ...extraFields], [tableFields, extraFields])
  const chosen = all.filter((f) => on.has(f.id))

  const toggle = (id: string) =>
    setOn((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const setGroup = (fields: CsvField<T>[], value: boolean) =>
    setOn((prev) => {
      const next = new Set(prev)
      for (const f of fields) {
        if (value) next.add(f.id)
        else next.delete(f.id)
      }
      return next
    })

  const download = () => {
    const header = chosen.map((f) => f.label)
    const lines = rows.map((r) => chosen.map((f) => f.get(r)))
    const csv = [header, ...lines].map((r) => r.map(esc).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onDone?.()
    onClose()
  }

  const preview = rows.slice(0, 5)

  const group = (label: string, hint: string, fields: CsvField<T>[]) =>
    fields.length === 0 ? null : (
      <fieldset className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <legend className="t-body t-strong text-[var(--text-1)]">{label}</legend>
            <p className="t-small text-[var(--text-3)]">{hint}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button type="button" size="sm" variant="ghost" onClick={() => setGroup(fields, true)}>
              Todas
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setGroup(fields, false)}>
              Nenhuma
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          {fields.map((f) => (
            <label key={f.id} className="flex items-center gap-2.5 min-h-11 cursor-pointer t-small text-[var(--text-1)]">
              <input type="checkbox" checked={on.has(f.id)} onChange={() => toggle(f.id)} className="w-4 h-4 accent-[var(--run)] shrink-0" />
              <span className="truncate">{f.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )

  return (
    <Sheet onClose={onClose} variant="center" ariaLabel={title} panelClassName="!max-w-[640px] flex flex-col overflow-hidden">
      <SheetHeader title={title} subtitle={`${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'} · ${chosen.length} colunas`} onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {group('Colunas da tabela', 'O que vês agora na tabela.', tableFields)}
        {group('Outros dados da ficha', 'Acrescenta o que quiseres. Inclui dados pessoais: usa só para gestão da equipa.', extraFields)}

        <section className="space-y-2" aria-label="Pré-visualização">
          <h3 className="t-body t-strong text-[var(--text-1)]">Pré-visualização</h3>
          {chosen.length === 0 ? (
            <p className="t-small text-[var(--text-3)]">Escolhe pelo menos uma coluna.</p>
          ) : (
            <div className="overflow-x-auto border border-[var(--border-card)]">
              <table className="w-full t-small">
                <caption className="sr-only">Primeiras linhas do ficheiro CSV</caption>
                <thead>
                  <tr className="bg-[var(--surface-raised)] text-left">
                    {chosen.map((f) => (
                      <th key={f.id} scope="col" className="px-3 py-2 t-strong text-[var(--text-2)] whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={`${rowLabel(r)}-${i}`} className="border-t border-[var(--border-card)]">
                      {chosen.map((f) => (
                        <td key={f.id} className="px-3 py-2 text-[var(--text-1)] whitespace-nowrap">
                          {f.get(r) || <span className="text-[var(--text-3)]">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > preview.length && <p className="t-small text-[var(--text-3)]">… e mais {rows.length - preview.length}.</p>}
        </section>
      </div>
      <div className="px-5 py-4 border-t border-[var(--border-card)] flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" disabled={chosen.length === 0 || rows.length === 0} onClick={download}>
          <Download className="w-4 h-4" aria-hidden="true" /> Exportar CSV
        </Button>
      </div>
    </Sheet>
  )
}
