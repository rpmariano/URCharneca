import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Zap,
  ShieldCheck,
  Plus,
  Megaphone,
  Trophy,
  CalendarDays,
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
    race: 'bg-[var(--surface-card)] text-white border-[var(--run)]/50 hover:border-[var(--run)] shadow-2xl',
    run: 'bg-[var(--surface-card)] text-white border-[var(--run)]/50 hover:border-[var(--run)] shadow-2xl',
    warn: 'bg-[var(--surface-card)] text-white border-rose-500/50 hover:border-rose-400 shadow-2xl',
  }

  const iconStyles = {
    race: 'bg-[var(--run)] text-black font-black shadow-sm',
    run: 'bg-[var(--run)] text-black font-black shadow-sm',
    warn: 'bg-rose-500 text-white font-bold shadow-sm',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-xl transition-all active:scale-95 cursor-pointer ${toneStyles[tone]}`}
    >
      <span className="text-xs font-black uppercase tracking-wider font-display italic">{label}</span>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconStyles[tone]}`}>
        {icon}
      </span>
    </button>
  )
}

export const BottomNav: React.FC = () => {
  const { isAdminView, unreadNotificationsCount } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [fabOpen, setFabOpen] = useState(false)

  // Determinar índice da coluna ativa:
  // 0 = Início, 1 = Atividades (Corridas + Treinos juntos), 3 = Avisos, 4 = Clube/Admin
  const getActiveCol = (pathname: string) => {
    if (pathname === '/') return 0
    if (pathname.startsWith('/atividades') || pathname.startsWith('/corridas') || pathname.startsWith('/treinos')) return 1
    if (pathname.startsWith('/avisos')) return 3
    if (pathname.startsWith('/equipa') || pathname.startsWith('/perfil') || pathname.startsWith('/admin')) return 4
    return -1
  }

  const activeCol = getActiveCol(location.pathname)

  // Posição da pílula deslizante Nike Volt de topo
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
    navigate('/atividades?tab=treinos', { state: { openCreate: true } })
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
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setFabOpen(false)}
          />

          <div
            className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-end gap-2.5 w-max animate-in slide-in-from-bottom-6 duration-200"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          >
            <FabItem
              label={isAdminView ? 'Nova Prova Oficial' : 'Partilhar Nova Corrida'}
              tone="race"
              icon={<Trophy className="w-3.5 h-3.5 stroke-[2.5]" />}
              onClick={handleOpenCreateRace}
            />
            <FabItem
              label={isAdminView ? 'Marcar Treino Oficial' : 'Propor Treino / Corrida'}
              tone="run"
              icon={<CalendarDays className="w-3.5 h-3.5 stroke-[2.5]" />}
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

      {/* Barra Inferior com 5 Colunas e FAB Central Nike Volt */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 grid grid-cols-5 items-center pt-1.5 border-t"
        style={{
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-card)',
          minHeight: 'calc(66px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Pílula Deslizante Nike Volt */}
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
            `relative flex flex-col items-center justify-center py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95 font-display italic ${
              isActive
                ? 'text-[var(--run)]'
                : 'text-[var(--text-3)] hover:text-white'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Início</span>
        </NavLink>

        {/* Coluna 1: Atividades (Corridas & Treinos JUNTOS!) */}
        <NavLink
          to="/atividades"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95 font-display italic ${
              isActive || location.pathname.startsWith('/corridas') || location.pathname.startsWith('/treinos')
                ? 'text-[var(--run)]'
                : 'text-[var(--text-3)] hover:text-white'
            }`
          }
        >
          <Zap className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Atividades</span>
        </NavLink>

        {/* Coluna 2: Espaço Central Vazio para o FAB */}
        <div aria-hidden="true" className="h-full flex items-center justify-center" />

        {/* Coluna 3: Avisos */}
        <NavLink
          to="/avisos"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95 font-display italic ${
              isActive
                ? 'text-[var(--run)]'
                : 'text-[var(--text-3)] hover:text-white'
            }`
          }
        >
          <div className="relative">
            <Megaphone className="w-5 h-5 mb-0.5 stroke-[2.2]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--run)] shadow-[0_0_8px_#d8ff00]" />
            )}
          </div>
          <span>Avisos</span>
        </NavLink>

        {/* Coluna 4: Clube / Perfil & Admin */}
        <NavLink
          to="/equipa"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95 font-display italic ${
              isActive
                ? 'text-[var(--run)]'
                : 'text-[var(--text-3)] hover:text-white'
            }`
          }
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span>Clube</span>
        </NavLink>

        {/* Botão FAB Central Elevado Nike Volt */}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`absolute left-1/2 -translate-x-1/2 w-13 h-13 rounded-full flex items-center justify-center border-[3px] z-50 cursor-pointer transition active:scale-90 text-black font-black ${
            fabOpen ? 'fab-open' : ''
          }`}
          style={{
            top: -20,
            background: 'var(--grad-run)',
            borderColor: 'var(--bg-app)',
            boxShadow: 'var(--shadow-fab)',
          }}
          aria-label={fabOpen ? 'Fechar menu' : 'Ações rápidas'}
        >
          <Plus className="w-6 h-6 stroke-[3.5] fab-icon" />
        </button>
      </nav>
    </>
  )
}
