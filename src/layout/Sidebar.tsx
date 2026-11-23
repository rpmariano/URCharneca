import React from 'react'
import { NavLink } from 'react-router-dom'
import { CircleUserRound, Keyboard, Megaphone, Search, ShieldCheck, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'

export const SIDEBAR_ITEMS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean; key: string }> = [
  { to: '/', label: 'Explorar', icon: Search, end: true, key: 'e' },
  { to: '/inscricoes', label: 'Inscrições', icon: Ticket, key: 'i' },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone, key: 'c' },
  { to: '/admin', label: 'Gerir', icon: ShieldCheck, key: 'g' },
  { to: '/perfil', label: 'Perfil', icon: CircleUserRound, key: 'p' },
]

/** Barra lateral fixa do shell desktop (só para administradores, >= 1024 px). */
export const Sidebar: React.FC<{ onHelp: () => void }> = ({ onHelp }) => {
  const { unreadNotificationsCount, currentUser } = useApp()
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
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `desk-nav-link${isActive ? ' is-active' : ''}`}>
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
