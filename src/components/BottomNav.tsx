import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Home, Megaphone, Plus, ShieldCheck, Trophy, User, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { openCreateEvent, openCreateNotice, openCreateRace } from '../utils/appEvents'

/**
 * Navegação inferior: Início · Atividades · [+] · Comunicados · Admin/Perfil
 * O botão central cria (admin: prova, treino, evento, comunicado) ou sugere uma prova (atleta).
 */
export const BottomNav: React.FC = () => {
  const { isAdminView, unreadNotificationsCount } = useApp()
  const [fabOpen, setFabOpen] = useState(false)

  const fabActions = [
    { label: 'Nova prova', icon: Trophy, run: () => openCreateRace() },
    { label: 'Novo treino', icon: CalendarPlus, run: () => openCreateEvent('training') },
    { label: 'Novo evento', icon: Users, run: () => openCreateEvent('social') },
    { label: 'Comunicado', icon: Megaphone, run: () => openCreateNotice() },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition ${
      isActive ? 'text-[var(--run)]' : 'text-[var(--text-3)]'
    }`

  return (
    <>
      {fabOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'var(--bg-scrim)' }} onClick={() => setFabOpen(false)} />
          <div
            className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
            style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
          >
            {fabActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setFabOpen(false)
                  a.run()
                }}
                className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full bg-[var(--bg-sheet)] border border-[var(--border-card-strong)] text-sm font-bold text-[var(--text-1)] shadow-xl cursor-pointer active:scale-95 min-w-[180px] justify-between"
              >
                {a.label}
                <span className="w-8 h-8 rounded-full bg-[var(--run)] text-[var(--on-accent)] flex items-center justify-center">
                  <a.icon className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 grid grid-cols-5 items-center border-t"
        style={{
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border-card)',
          paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <NavLink to="/" end className={linkClass}>
          <Home className="w-5 h-5" />
          Início
        </NavLink>
        <NavLink to="/atividades" className={linkClass}>
          <CalendarDays className="w-5 h-5" />
          Atividades
        </NavLink>

        <div className="flex justify-center">
          <button
            type="button"
            aria-label={isAdminView ? 'Criar' : 'Sugerir prova'}
            aria-expanded={isAdminView ? fabOpen : undefined}
            onClick={() => (isAdminView ? setFabOpen((v) => !v) : openCreateRace())}
            className="w-12 h-12 -mt-5 rounded-full bg-[var(--run)] text-[var(--on-accent)] flex items-center justify-center cursor-pointer active:scale-95 transition"
            style={{ boxShadow: 'var(--shadow-fab)' }}
          >
            <Plus className={`w-6 h-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} strokeWidth={2.75} />
          </button>
        </div>

        <NavLink to="/comunicados" className={linkClass}>
          <span className="relative">
            <Megaphone className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </span>
          Comunicados
        </NavLink>

        {isAdminView ? (
          <NavLink to="/admin" className={linkClass}>
            <ShieldCheck className="w-5 h-5" />
            Admin
          </NavLink>
        ) : (
          <NavLink to="/perfil" className={linkClass}>
            <User className="w-5 h-5" />
            Perfil
          </NavLink>
        )}
      </nav>
    </>
  )
}
