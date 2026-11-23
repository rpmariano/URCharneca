import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CalendarHeart, CircleUserRound, Dumbbell, Flag, Keyboard, Megaphone, Search, ShieldCheck, Sparkles, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'

export const SIDEBAR_ITEMS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean; key: string }> = [
  { to: '/', label: 'Explorar', icon: Search, end: true, key: 'e' },
  { to: '/inscricoes', label: 'Inscrições', icon: Ticket, key: 'i' },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone, key: 'c' },
  { to: '/admin', label: 'Gerir', icon: ShieldCheck, key: 'g' },
  { to: '/perfil', label: 'Perfil', icon: CircleUserRound, key: 'p' },
]

/** Submenu de Explorar (categorias). `tipo` é o valor de `?tipo=` na página Explorar. */
const EXPLORE_SUB: Array<{ tipo: string; label: string; icon: LucideIcon; level: 1 | 2 }> = [
  { tipo: '', label: 'Destaques', icon: Sparkles, level: 1 },
  { tipo: 'provas', label: 'Provas', icon: Flag, level: 1 },
  { tipo: 'trofeu_cascais', label: 'Troféu', icon: Flag, level: 2 },
  { tipo: 'equipa', label: 'Clube', icon: Flag, level: 2 },
  { tipo: 'individual', label: 'Comunidade', icon: Flag, level: 2 },
  { tipo: 'training', label: 'Treinos', icon: Dumbbell, level: 1 },
  { tipo: 'event', label: 'Eventos', icon: CalendarHeart, level: 1 },
]
const RACE_TIPOS = ['provas', 'trofeu_cascais', 'equipa', 'individual']

/** Barra lateral fixa do shell desktop (só para administradores, >= 1024 px). */
export const Sidebar: React.FC<{ onHelp: () => void }> = ({ onHelp }) => {
  const { unreadNotificationsCount, currentUser } = useApp()
  const { pathname, search } = useLocation()
  const tipo = new URLSearchParams(search).get('tipo') ?? ''
  const onExplore = pathname === '/'
  return (
    <aside className="desk-sidebar" aria-label="Barra lateral">
      <div className="desk-brand">
        <img src={`${import.meta.env.BASE_URL}urc-emblema.jpg`} alt="" width={40} height={40} className="rounded-full" />
        <div className="min-w-0">
          <div className="t-body t-strong text-[var(--text-1)] truncate">U.R. Charneca</div>
          <div className="t-small text-[var(--text-3)]">Gestão da equipa</div>
        </div>
      </div>
      <div className="brand-stripe mx-2 -mt-2" aria-hidden="true" />
      <nav aria-label="Navegação principal" className="desk-nav">
        {SIDEBAR_ITEMS.map((item) => (
          <React.Fragment key={item.to}>
          <NavLink to={item.to} end={item.end} className={({ isActive }) => `desk-nav-link${isActive && item.to !== '/' ? ' is-active' : ''}${item.to === '/' && onExplore ? ' is-parent' : ''}`}>
            <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
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
                      <o.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
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
        <div className="t-small text-[var(--text-3)] truncate px-3">{currentUser.name}</div>
        <button type="button" className="desk-nav-link" onClick={onHelp}>
          <Keyboard className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Atalhos</span>
          <kbd className="desk-kbd">?</kbd>
        </button>
      </div>
    </aside>
  )
}
