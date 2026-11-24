import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useOpenRaces } from '../utils/openRaces'
import { plural } from '../utils/formatters'
import { Counter } from './ui'

/**
 * Navegação inferior: Explorar · Inscrições · Comunicados · Perfil (+ Gerir para administradores).
 * Só texto (Archivo condensada), régua escura de 3 px por cima; o separador ativo fica preenchido a azul.
 */
export const BottomNav: React.FC = () => {
  const { isAdminView, unreadNotificationsCount } = useApp()
  const { fresh } = useOpenRaces()

  const items: Array<{ to: string; label: string; end?: boolean; badge?: number; badgeLabel?: string }> = [
    { to: '/', label: 'Explorar', end: true, badge: fresh.length, badgeLabel: plural(fresh.length, 'prova nova', 'provas novas') },
    { to: '/inscricoes', label: 'Inscrições' },
    { to: '/comunicados', label: 'Comunicados', badge: unreadNotificationsCount },
    ...(isAdminView ? [{ to: '/admin', label: 'Gerir' }] : []),
    { to: '/perfil', label: 'Perfil' },
  ]
  const many = items.length > 4

  return (
    <nav
      aria-label="Navegação principal"
      className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-30 grid border-t-[3px] border-[var(--rule-strong)]"
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
          style={{ outlineOffset: -4 }}
          className={({ isActive }) =>
            `on-nav relative h-[60px] flex items-end justify-center px-1 pb-[15px] font-display font-extrabold leading-none whitespace-nowrap transition-colors ${
              many ? 'text-[15px] [font-stretch:62%]' : 'text-[17px] [font-stretch:75%]'
            } ${isActive ? 'bg-[var(--run)] text-[var(--on-accent)] [--focus:#ffffff]' : 'text-[var(--text-1)] hover:bg-[var(--surface-raised)]'}`
          }
        >
          <span className="max-w-full overflow-hidden text-ellipsis">{item.label}</span>
          {Boolean(item.badge) && (
            <>
              <Counter value={item.badge!} className="absolute top-1 right-1 !min-w-[20px] !h-5 !px-1 !text-[12px]" />
              <span className="sr-only">
                {item.badge} {item.badgeLabel ?? 'por ler'}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
