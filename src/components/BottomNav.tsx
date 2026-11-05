import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Trophy,
  CalendarDays,
  ShieldCheck,
  Plus,
  Megaphone,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { openCreateRace } from '../utils/appEvents'

interface FabItemProps {
  label: string
  icon: React.ReactNode
  tone: 'race' | 'run' | 'warn'
  onClick: (e: React.MouseEvent) => void
}

const FabItem: React.FC<FabItemProps> = ({ label, icon, tone, onClick }) => {
  const toneStyles = {
    race: 'bg-[var(--surface-card)] text-[var(--text-1)] border-amber-400/40 hover:border-amber-400 shadow-xl',
    run: 'bg-[var(--surface-card)] text-[var(--text-1)] border-sky-400/40 hover:border-sky-400 shadow-xl',
    warn: 'bg-[var(--surface-card)] text-[var(--text-1)] border-rose-400/40 hover:border-rose-400 shadow-xl',
  }

  const iconStyles = {
    race: 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-bold shadow-xs',
    run: 'bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-xs',
    warn: 'bg-gradient-to-tr from-rose-500 to-rose-400 text-white shadow-xs',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-xl transition-all active:scale-95 cursor-pointer ${toneStyles[tone]}`}
    >
      <span className="text-xs font-bold tracking-tight">{label}</span>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconStyles[tone]}`}>
        {icon}
      </span>
    </button>
  )
}

export const BottomNav: React.FC = () => {
  const { isAdminView } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [fabOpen, setFabOpen] = useState(false)

  // Determinar índice da coluna ativa (0 = Início, 1 = Corridas, 3 = Treinos, 4 = Admin)
  const getActiveCol = (pathname: string) => {
    if (pathname === '/') return 0
    if (pathname.startsWith('/corridas')) return 1
    if (pathname.startsWith('/treinos')) return 3
    if (pathname.startsWith('/equipa') || pathname.startsWith('/admin')) return 4
    return -1
  }

  const activeCol = getActiveCol(location.pathname)

  // Cálculo da posição da pílula deslizante de topo
  const pillLeftPercent =
    activeCol === 0 ? 10 : activeCol === 1 ? 30 : activeCol === 3 ? 70 : activeCol === 4 ? 90 : -20

  const handleOpenCreateRace = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFabOpen(false)
    openCreateRace()
  }

  const handleOpenCreateTraining = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFabOpen(false)
    navigate('/treinos', { state: { openCreate: true } })
  }

  const handleOpenNotice = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFabOpen(false)
    navigate('/avisos', { state: { openCreate: true } })
  }

  return (
    <>
      {/* Scrim e Menu Speed-Dial do FAB */}
      {fabOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setFabOpen(false)}
          />

          <div
            className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-end gap-2.5 w-max animate-in slide-in-from-bottom-6 duration-200"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          >
            <FabItem
              label={isAdminView ? 'Nova Prova Oficial' : 'Partilhar Nova Corrida'}
              tone="race"
              icon={<Trophy className="w-3.5 h-3.5" />}
              onClick={handleOpenCreateRace}
            />
            <FabItem
              label={isAdminView ? 'Criar Treino na Agenda' : 'Consultar Treinos'}
              tone="run"
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              onClick={handleOpenCreateTraining}
            />
            {isAdminView && (
              <FabItem
                label="Enviar Comunicado Oficial"
                tone="warn"
                icon={<Megaphone className="w-3.5 h-3.5" />}
                onClick={handleOpenNotice}
              />
            )}
          </div>
        </>
      )}

      {/* Barra Inferior com 5 Colunas e FAB Central Elevado */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 grid grid-cols-5 items-center pt-1.5 border-t"
        style={{
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-card)',
          minHeight: 'calc(66px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* A Minhoca / Pílula Elástica de Topo IronCoach */}
        <span
          aria-hidden="true"
          className="absolute top-0 h-[3px] rounded-full transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `calc(${pillLeftPercent}% - 14px)`,
            width: '28px',
            background: 'var(--grad-nav-pill)',
            boxShadow: 'var(--glow-pill)',
          }}
        />

        {/* Coluna 0: Início */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[11px] font-semibold transition active:scale-95 ${
              isActive
                ? 'text-[var(--run)] font-black'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Início</span>
        </NavLink>

        {/* Coluna 1: Corridas */}
        <NavLink
          to="/corridas"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[11px] font-semibold transition active:scale-95 ${
              isActive
                ? 'text-[var(--run)] font-black'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`
          }
        >
          <Trophy className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Corridas</span>
        </NavLink>

        {/* Coluna 2: Espaço Central Vazio para o FAB */}
        <div aria-hidden="true" className="h-full flex items-center justify-center" />

        {/* Coluna 3: Treinos */}
        <NavLink
          to="/treinos"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[11px] font-semibold transition active:scale-95 ${
              isActive
                ? 'text-[var(--run)] font-black'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`
          }
        >
          <CalendarDays className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Treinos</span>
        </NavLink>

        {/* Coluna 4: Menu de Admin & Equipa */}
        <NavLink
          to="/equipa"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[11px] font-semibold transition active:scale-95 ${
              isActive
                ? 'text-[var(--run)] font-black'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`
          }
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Admin</span>
        </NavLink>

        {/* Botão FAB Central Elevado (Estilo IronCoach em Dourado / Âmbar de Prova) */}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`absolute left-1/2 -translate-x-1/2 w-13 h-13 rounded-full flex items-center justify-center border-[3.5px] z-50 cursor-pointer transition active:scale-90 text-slate-950 font-black ${
            fabOpen ? 'fab-open' : ''
          }`}
          style={{
            top: -20,
            background: 'var(--grad-race)',
            borderColor: 'var(--bg-app)',
            boxShadow: 'var(--shadow-fab)',
          }}
          aria-label={fabOpen ? 'Fechar menu' : 'Ações rápidas'}
        >
          <Plus className="w-6 h-6 stroke-[3] fab-icon" />
        </button>
      </nav>
    </>
  )
}
