import React, { useId } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Tabela de classificação reutilizável (Troféu: clubes e atletas).
 * - `<table>` com legenda, `<th scope>`, `aria-sort` nas colunas ordenáveis.
 * - Cabeçalho fixo: em `page` cola ao topo da página (por baixo do AppHeader, sem deslocamento horizontal);
 *   em `box` a tabela tem a sua própria área de deslocamento (horizontal e vertical) e a coluna do nome fica fixa.
 * - Grupos opcionais (ex.: escalões) com cabeçalho colapsável e linhas expansíveis (`aria-expanded`).
 * Estilos em src/layout/standings.css.
 */
export interface StandingsColumn<T> {
  id: string
  header: React.ReactNode
  /** Nome lido pelos leitores de ecrã quando `header` é abreviado (ex.: "P1" → "Prova 1"). */
  title?: string
  render: (row: T) => React.ReactNode
  /** Coluna do nome: `<th scope="row">`, fixa à esquerda em `box`; tem o botão de expandir. */
  rowHeader?: boolean
  align?: 'left' | 'right' | 'center'
  /** Chave de ordenação passada a `onSort`. Sem ela a coluna não é ordenável. */
  sortKey?: string
  className?: string
}

export interface StandingsGroup<T> {
  id: string
  label: string
  /** Texto curto à direita do nome do grupo (ex.: "6 atletas"). */
  meta?: string
  rows: T[]
  /** Linhas acrescentadas depois de um separador "…" (ex.: a U.R. Charneca fora do top 10). */
  trailingRows?: T[]
}

interface Props<T> {
  caption: string
  columns: StandingsColumn<T>[]
  groups: StandingsGroup<T>[]
  rowKey: (row: T) => string
  /** Linha destacada ("os meus", a U.R. Charneca). */
  isHighlighted?: (row: T) => boolean
  /** Nome usado nos rótulos acessíveis (ex.: botão de expandir). */
  rowLabel: (row: T) => string
  mode: 'page' | 'box'
  /** Mostra o cabeçalho de cada grupo (com mais de um grupo). */
  showGroupHeaders?: boolean
  collapsed?: Set<string>
  onToggleGroup?: (id: string) => void
  /** Conteúdo da linha expandida; sem ele as linhas não se expandem. */
  renderDetails?: (row: T) => React.ReactNode
  expanded?: Set<string>
  onToggleRow?: (key: string) => void
  sort?: { key: string; dir: 'asc' | 'desc' }
  onSort?: (key: string) => void
  /** Id do elemento da linha (para "Ver na tabela"). */
  rowDomId?: (row: T) => string | undefined
  empty?: React.ReactNode
  loading?: boolean
}

export function StandingsTable<T>({
  caption,
  columns,
  groups,
  rowKey,
  isHighlighted,
  rowLabel,
  mode,
  showGroupHeaders,
  collapsed,
  onToggleGroup,
  renderDetails,
  expanded,
  onToggleRow,
  sort,
  onSort,
  rowDomId,
  empty,
  loading,
}: Props<T>) {
  const uid = useId()
  const colCount = columns.length
  const total = groups.reduce((n, g) => n + g.rows.length + (g.trailingRows?.length ?? 0), 0)

  const alignCls = (c: StandingsColumn<T>) => (c.align === 'right' ? 'st-r' : c.align === 'center' ? 'st-c' : '')

  const renderRow = (row: T) => {
    const k = rowKey(row)
    const hi = isHighlighted?.(row) ?? false
    const canExpand = Boolean(renderDetails && onToggleRow)
    const open = canExpand && (expanded?.has(k) ?? false)
    const detailsId = `${uid}-d-${k}`
    return (
      <React.Fragment key={k}>
        <tr id={rowDomId?.(row)} className={`st-row ${hi ? 'is-hi' : ''} ${open ? 'is-open' : ''}`}>
          {columns.map((c) => {
            const cls = `${alignCls(c)} ${c.rowHeader ? 'st-name' : ''} ${c.className ?? ''}`
            if (c.rowHeader) {
              return (
                <th key={c.id} scope="row" className={cls}>
                  {canExpand ? (
                    <button
                      type="button"
                      className="st-expand"
                      aria-expanded={open}
                      aria-controls={open ? detailsId : undefined}
                      title={`${open ? 'Esconder' : 'Ver'} os resultados de ${rowLabel(row)} prova a prova`}
                      onClick={() => onToggleRow!(k)}
                    >
                      <span className="st-expand-body">{c.render(row)}</span>
                      <span className="sr-only">(resultados por prova)</span>
                      <ChevronDown className="st-chev" aria-hidden="true" />
                    </button>
                  ) : (
                    c.render(row)
                  )}
                </th>
              )
            }
            return (
              <td key={c.id} className={cls}>
                {c.render(row)}
              </td>
            )
          })}
        </tr>
        {open && renderDetails && (
          <tr id={detailsId} className={`st-details ${hi ? 'is-hi' : ''}`}>
            <td colSpan={colCount}>
              <div className="st-details-body">{renderDetails(row)}</div>
            </td>
          </tr>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className={`st-wrap st-${mode}`}>
      <table className="st-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort && c.sortKey && sort.key === c.sortKey
              return (
                <th
                  key={c.id}
                  scope="col"
                  className={`${alignCls(c)} ${c.rowHeader ? 'st-name' : ''} ${c.className ?? ''}`}
                  aria-sort={c.sortKey && onSort ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  title={c.title}
                >
                  {c.sortKey && onSort ? (
                    <button type="button" className="st-sort" onClick={() => onSort(c.sortKey!)}>
                      {c.title && c.title !== c.header ? (
                        <>
                          <span aria-hidden="true">{c.header}</span>
                          <span className="sr-only">{c.title}</span>
                        </>
                      ) : (
                        c.header
                      )}
                      {active ? (
                        sort!.dir === 'asc' ? <ArrowUp className="st-sort-ic" aria-hidden="true" /> : <ArrowDown className="st-sort-ic" aria-hidden="true" />
                      ) : (
                        <ArrowUpDown className="st-sort-ic is-idle" aria-hidden="true" />
                      )}
                    </button>
                  ) : c.title && c.title !== c.header ? (
                    <>
                      <span aria-hidden="true">{c.header}</span>
                      <span className="sr-only">{c.title}</span>
                    </>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        {loading ? (
          <tbody>
            <tr>
              <td colSpan={colCount} className="st-state" role="status">
                A carregar classificações…
              </td>
            </tr>
          </tbody>
        ) : total === 0 ? (
          <tbody>
            <tr>
              <td colSpan={colCount} className="st-state">
                {empty ?? 'Sem resultados.'}
              </td>
            </tr>
          </tbody>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed?.has(g.id) ?? false
            return (
              <tbody key={g.id} className="st-group">
                {showGroupHeaders && (
                  <tr className="st-group-head">
                    <th scope="colgroup" colSpan={colCount}>
                      {onToggleGroup ? (
                        <button type="button" className="st-group-btn" aria-expanded={!isCollapsed} onClick={() => onToggleGroup(g.id)}>
                          {isCollapsed ? <ChevronRight className="st-group-ic" aria-hidden="true" /> : <ChevronDown className="st-group-ic" aria-hidden="true" />}
                          <span className="st-group-label">{g.label}</span>
                          {g.meta && <span className="st-group-meta">{g.meta}</span>}
                        </button>
                      ) : (
                        <span className="st-group-btn">
                          <span className="st-group-label">{g.label}</span>
                          {g.meta && <span className="st-group-meta">{g.meta}</span>}
                        </span>
                      )}
                    </th>
                  </tr>
                )}
                {!isCollapsed && g.rows.map(renderRow)}
                {!isCollapsed && g.trailingRows && g.trailingRows.length > 0 && (
                  <>
                    <tr className="st-gap" aria-hidden="true">
                      <td colSpan={colCount}>…</td>
                    </tr>
                    {g.trailingRows.map(renderRow)}
                  </>
                )}
              </tbody>
            )
          })
        )}
      </table>
    </div>
  )
}

/** Lugar em número grande; o 1.º em destaque. Os leitores de ecrã ouvem "1.º (medalha de ouro)". */
export const RankBadge: React.FC<{ pos: number; highlight?: boolean }> = ({ pos, highlight }) => {
  if (!pos || pos <= 0) {
    return (
      <span className="st-rank" aria-label="Sem classificação">
        –
      </span>
    )
  }
  const medal = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : ''
  const medalName = pos === 1 ? 'ouro' : pos === 2 ? 'prata' : pos === 3 ? 'bronze' : ''
  return (
    <span className={`st-rank ${medal ? `is-${medal}` : highlight ? 'is-hi' : ''}`}>
      {pos}
      <span className="sr-only">.º{medal && ` (medalha de ${medalName})`}</span>
    </span>
  )
}
