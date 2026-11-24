import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CircleUserRound, Keyboard, Megaphone, Search, ShieldCheck, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useOpenRaces } from '../utils/openRaces'
import { plural } from '../utils/formatters'

/** `icon` serve os atalhos de teclado (ajuda); a barra lateral mostra só texto. */
export const SIDEBAR_ITEMS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean; key: string; adminOnly?: boolean }> = [
  { to: '/', label: 'Explorar', icon: Search, end: true, key: 'e' },
  { to: '/inscricoes', label: 'Inscrições', icon: Ticket, key: 'i' },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone, key: 'c' },
  { to: '/admin', label: 'Gerir', icon: ShieldCheck, key: 'g', adminOnly: true },
  { to: '/perfil', label: 'Perfil', icon: CircleUserRound, key: 'p' },
]

/** Submenu de Explorar (categorias). `tipo` é o valor de `?tipo=` na página Explorar. */
const EXPLORE_SUB: Array<{ tipo: string; label: string; level: 1 | 2 }> = [
  { tipo: '', label: 'Destaques', level: 1 },
  { tipo: 'provas', label: 'Provas', level: 1 },
  { tipo: 'trofeu_cascais', label: 'Troféu', level: 2 },
  { tipo: 'equipa', label: 'Clube', level: 2 },
  { tipo: 'individual', label: 'Comunidade', level: 2 },
  { tipo: 'training', label: 'Treinos', level: 1 },
  { tipo: 'event', label: 'Eventos', level: 1 },
]
const RACE_TIPOS = ['provas', 'trofeu_cascais', 'equipa', 'individual']

/** Itens da barra lateral para o papel ativo: "Gerir" só aparece na vista de administrador. */
export const useSidebarItems = () => {
  const { isAdminView } = useApp()
  return useMemo(() => SIDEBAR_ITEMS.filter((i) => !i.adminOnly || isAdminView), [isAdminView])
}

/** Barra lateral fixa do shell de computador (todos os utilizadores, >= 1024 px; "Gerir" só para administradores). */
export const Sidebar: React.FC<{ onHelp: () => void }> = ({ onHelp }) => {
  const { unreadNotificationsCount, currentUser, isAdminView } = useApp()
  const { fresh } = useOpenRaces()
  const items = useSidebarItems()
  const { pathname, search } = useLocation()
  const tipo = new URLSearchParams(search).get('tipo') ?? ''
  const onExplore = pathname === '/'
  return (
    <aside className="desk-sidebar" aria-label="Barra lateral">
      <div className="desk-brand on-blue">
        <img src={`${import.meta.env.BASE_URL}urc-emblema.jpg`} alt="" width={44} height={44} className="w-11 h-11 object-cover shrink-0" />
        <div className="min-w-0">
          <div className="desk-brand-name">U.R. Charneca</div>
          <div className="desk-brand-role">{isAdminView ? 'Gestão da equipa' : 'Atletismo'}</div>
        </div>
      </div>
      <nav aria-label="Navegação principal" className="desk-nav">
        {items.map((item) => (
          <React.Fragment key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `desk-nav-link${isActive && item.to !== '/' ? ' is-active' : ''}${item.to === '/' && onExplore ? ' is-parent' : ''}`
              }
            >
              <span className="flex-1">{item.label}</span>
              {item.to === '/' && fresh.length > 0 && (
                <>
                  <span aria-hidden="true" className="desk-badge">
                    {fresh.length}
                  </span>
                  <span className="sr-only">
                    {fresh.length} {plural(fresh.length, 'prova nova', 'provas novas')}
                  </span>
                </>
              )}
              {item.to === '/comunicados' && unreadNotificationsCount > 0 && (
                <>
                  <span aria-hidden="true" className="desk-badge">
                    {unreadNotificationsCount}
                  </span>
                  <span className="sr-only">{unreadNotificationsCount} por ler</span>
                </>
              )}
            </NavLink>
            {item.to === '/' && (
              <ul className="desk-subnav" aria-label="Categorias de Explorar">
                {EXPLORE_SUB.filter((o) => o.level === 1 || RACE_TIPOS.includes(tipo)).map((o) => {
                  const active = onExplore && (o.tipo === '' ? tipo === '' : o.tipo === 'provas' ? tipo === 'provas' : tipo === o.tipo)
                  const parentOfActive = o.tipo === 'provas' && onExplore && RACE_TIPOS.includes(tipo) && tipo !== 'provas'
                  return (
                    <li key={o.tipo || 'all'}>
                      <NavLink
                        to={o.tipo ? `/?tipo=${o.tipo}` : '/'}
                        className={`desk-nav-link desk-sub-link${o.level === 2 ? ' is-level2' : ''}${active ? ' is-active' : ''}${parentOfActive ? ' is-parent' : ''}`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="flex-1">{o.label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className="desk-sidebar-foot">
        <div className="t-small t-strong text-[var(--text-1)] truncate px-5 pb-1">{currentUser.name}</div>
        <button type="button" className="desk-nav-link" onClick={onHelp}>
          <Keyboard className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Atalhos</span>
          <kbd className="desk-kbd">?</kbd>
        </button>
      </div>
    </aside>
  )
}
