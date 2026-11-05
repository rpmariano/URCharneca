import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Check,
  ShieldCheck,
  User,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export const Header: React.FC = () => {
  const {
    profiles,
    currentUser,
    activeRole,
    isAdminView,
    unreadNotificationsCount,
    setCurrentUserById,
    setActiveRole,
    themeMode,
    setThemeMode,
  } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  // Iniciais do utilizador atual
  const initials = currentUser.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  const cycleTheme = () => {
    if (themeMode === 'balanced') setThemeMode('light')
    else if (themeMode === 'light') setThemeMode('dark')
    else setThemeMode('balanced')
  }

  return (
    <>
      <header
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 py-2.5 transition-all border-b"
        style={{
          background: 'var(--bg-header)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Identidade da Equipa */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left group cursor-pointer active:scale-95 transition"
          >
            {/* Brasão URC */}
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-white/15 bg-slate-900/40 shadow-xs">
              <img
                src="/urc-emblema.jpg"
                alt="URC"
                width={36}
                height={36}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="font-display font-black text-xs tracking-tight text-sky-400 absolute pointer-events-none">
                URC
              </span>
            </div>

            <div className="min-w-0">
              <div className="font-display font-black text-sm tracking-tight text-[var(--text-1)] leading-none flex items-center gap-1.5">
                <span>UR</span>
                <span className="text-sky-400">CHARNECA</span>
              </div>
              <div className="text-[11px] text-sky-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <span>Armada Azul</span>
                <span className="opacity-40">•</span>
                <span className="text-amber-400 font-extrabold">Atletismo</span>
              </div>
            </div>
          </button>

          {/* Lado Direito: Alternador Rápido de Tema + Perfil Ativo + Notificações */}
          <div className="flex items-center gap-1.5">
            {/* Botão Rápido de Tema (Meio-termo / Claro / Escuro) */}
            <button
              type="button"
              onClick={cycleTheme}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-white/5 hover:bg-white/10 border border-[var(--border-card)] transition cursor-pointer active:scale-95"
              title={`Ambiente atual: ${themeMode === 'balanced' ? 'Meio-Termo (Slate Navy)' : themeMode === 'light' ? 'Luminoso (Claro)' : 'Escuro (Obsidiana)'}. Toca para alternar.`}
            >
              {themeMode === 'balanced' ? (
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              ) : themeMode === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>

            {/* Seletor de Perfil / Utilizador */}
            <div className="relative">
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-card)] bg-white/5 p-1 min-h-[36px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => navigate('/perfil')}
                  title="Abrir a minha ficha de perfil"
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-semibold hover:bg-white/10 transition cursor-pointer"
                >
                  {/* Avatar com Iniciais */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      isAdminView
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-xs'
                    }`}
                  >
                    {initials}
                  </span>

                  <span className="max-w-[70px] truncate font-bold text-[11px] text-[var(--text-1)]">
                    {currentUser.nickname || currentUser.name.split(' ')[0]}
                  </span>
                </button>

                {/* Botão de Menu de Troca / Papel */}
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title="Mudar utilizador / simular papel"
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-black uppercase transition cursor-pointer ${
                    isAdminView
                      ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                      : 'bg-sky-400/20 text-sky-300 hover:bg-sky-400/30'
                  }`}
                >
                  <span>{isAdminView ? 'Admin' : 'Atleta'}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70 shrink-0" />
                </button>
              </div>

              {/* Menu Dropdown Adaptável */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-76 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3 text-xs"
                    style={{
                      background: 'var(--bg-sheet)',
                      border: '1px solid var(--border-card-strong)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {/* Header do Menu */}
                    <div className="pb-2.5 border-b border-white/10 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-extrabold text-[var(--text-1)] text-xs truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-[11px] text-sky-400 font-semibold mt-0.5">
                          {currentUser.escalao}
                        </div>
                      </div>
                      {currentUser.nif && (
                        <span className="font-mono text-[11px] text-[var(--text-3)] bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                          NIF {currentUser.nif}
                        </span>
                      )}
                    </div>

                    {/* Alternador de Ambiente: Meio-Termo / Claro / Escuro */}
                    <div>
                      <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Ambiente de Design</span>
                        <span className="text-sky-400 font-bold capitalize">
                          {themeMode === 'balanced'
                            ? 'Meio-Termo'
                            : themeMode === 'light'
                            ? 'Luminoso'
                            : 'Escuro'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setThemeMode('balanced')}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            themeMode === 'balanced'
                              ? 'bg-sky-500 text-slate-950 shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Meio-Termo
                        </button>
                        <button
                          type="button"
                          onClick={() => setThemeMode('light')}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            themeMode === 'light'
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          Claro
                        </button>
                        <button
                          type="button"
                          onClick={() => setThemeMode('dark')}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            themeMode === 'dark'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          Escuro
                        </button>
                      </div>
                    </div>

                    {/* Alternador Rápido de Papel: Atleta vs Administrador */}
                    <div>
                      <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Modo de Visualização
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('athlete')
                            setMenuOpen(false)
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeRole === 'athlete'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <User className="w-3 h-3" />
                          Atleta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('admin')
                            setMenuOpen(false)
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeRole === 'admin'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Admin
                        </button>
                      </div>
                    </div>

                    {/* Mudar de Membro da Armada Azul */}
                    <div>
                      <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Mudar de Utilizador
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                        {profiles.map((p) => {
                          const selected = p.id === currentUser.id
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setCurrentUserById(p.id)
                                setMenuOpen(false)
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition cursor-pointer border ${
                                selected
                                  ? 'bg-sky-500/15 text-sky-300 font-bold border-sky-400/40'
                                  : 'bg-white/5 text-[var(--text-2)] border-white/5 hover:bg-white/10 hover:text-[var(--text-1)]'
                              }`}
                            >
                              <div className="truncate pr-1">
                                <div className="truncate">{p.name}</div>
                                <div className="text-[11px] text-[var(--text-3)] font-normal">
                                  {p.escalao} {p.dependents.length > 0 ? `• +${p.dependents.length} filho(a)` : ''}
                                </div>
                              </div>
                              {selected && (
                                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1.5" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Atalho para a Minha Ficha */}
                    <div className="pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/perfil')
                          setMenuOpen(false)
                        }}
                        className="w-full text-center text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline cursor-pointer py-1"
                      >
                        Abrir O Meu Perfil & Dependentes →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notificações / Avisos */}
            <button
              type="button"
              onClick={() => navigate('/avisos')}
              className="relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-white/5 hover:bg-white/10 border border-[var(--border-card)] shadow-2xs transition cursor-pointer shrink-0 active:scale-95"
              aria-label="Avisos"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
