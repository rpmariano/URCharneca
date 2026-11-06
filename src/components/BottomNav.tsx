import React from 'react'
import { NavLink } from 'react-router-dom'
import { CircleUserRound, Megaphone, Search, ShieldCheck, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * Navegação inferior: Explorar · Inscrições · Comunicados · Perfil (+ Gerir para administradores).
 */
export const BottomNav: React.FC = () => {
  const { isAdminView, unreadNotificationsCount } = useApp()

  const items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number }> = [
    { to: '/', label: 'Explorar', icon: Search, end: true },
    { to: '/inscricoes', label: 'Inscrições', icon: Ticket },
    { to: '/comunicados', label: 'Comunicados', icon: Megaphone, badge: unreadNotificationsCount },
    ...(isAdminView ? [{ to: '/admin', label: 'Gerir', icon: ShieldCheck }] : []),
    { to: '/perfil', label: 'Perfil', icon: CircleUserRound },
  ]

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 grid border-t border-[var(--border-card)]"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        background: 'var(--bg-nav)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `min-h-16 pt-2 pb-1.5 flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              isActive ? 'text-[var(--run)] t-strong' : 'text-[var(--text-3)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                {Boolean(item.badge) && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#b91c1c] text-white text-xs t-strong leading-none flex items-center justify-center"
                    >
                      {item.badge}
                    </span>
                    <span className="sr-only">{item.badge} por ler</span>
                  </>
                )}
              </span>
              <span className="max-w-full tracking-tight whitespace-nowrap">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
