import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {

  ChevronDown,
  Check,
  ShieldCheck,
  User,
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
    setThemeMode(themeMode === 'dark' ? 'balanced' : 'dark')
  }

  return (
    <>
      <header
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 py-2.5 transition-all border-b-2"
        style={{
          background: 'var(--bg-header)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--gold)',
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
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border-2 border-[var(--gold)] bg-black shadow-xs">
              <img
                src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
                alt="Emblema da União Recreativa da Charneca"
                width={44}
                height={44}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="font-display font-black text-xs tracking-tight text-[var(--gold)] absolute pointer-events-none">
                URC
              </span>
            </div>

            <div className="min-w-0">
              <div className="display text-[22px] text-[var(--text-1)]">
                UR <span className="text-[var(--run)]">Charneca</span>
              </div>
              <div className="eyebrow text-xs text-[var(--text-3)] mt-0.5">Atletismo</div>
            </div>
          </button>

          {/* Lado Direito: Alternador Rápido de Tema + Perfil Ativo + Notificações */}
          <div className="flex items-center gap-1.5">
            {/* Botão Rápido de Tema (Meio-termo / Claro / Escuro) */}
            <button
              type="button"
              onClick={cycleTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-[var(--surface-raised)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-card)] transition cursor-pointer active:scale-95"
              title={themeMode === 'dark' ? 'Ambiente azul-marinho. Toca para mudar para azul e branco.' : 'Ambiente azul e branco. Toca para mudar para azul-marinho.'}
              aria-label={themeMode === 'dark' ? 'Mudar para azul e branco' : 'Mudar para azul-marinho'}
            >
              {themeMode === 'dark' ? (
                <Moon className="w-4 h-4 text-[var(--run)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--run)]" />
              )}
            </button>

            {/* Seletor de Perfil / Utilizador */}
            <div className="relative">
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-card)] bg-[var(--surface-raised)] px-1 min-h-[44px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => navigate('/perfil')}
                  title="Abrir a minha ficha de perfil"
                  className="flex items-center gap-1.5 pl-1.5 pr-2 min-h-[44px] rounded-full text-xs font-semibold hover:bg-[var(--surface-card-hover)] transition cursor-pointer"
                >
                  {/* Avatar com Iniciais */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isAdminView
                        ? 'bg-[var(--gold)] text-[var(--on-gold)] shadow-xs'
                        : 'bg-[var(--run)] text-[var(--on-accent)] shadow-xs'
                    }`}
                  >
                    {initials}
                  </span>

                  <span className="max-w-[70px] truncate font-bold text-xs text-[var(--text-1)]">
                    {currentUser.nickname || currentUser.name.split(' ')[0]}
                  </span>
                </button>

                {/* Botão de Menu de Troca / Papel */}
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title="Mudar utilizador / simular papel"
                  className={`flex items-center gap-1 px-2 min-h-[44px] rounded-full text-xs font-black uppercase transition cursor-pointer ${
                    isAdminView
                      ? 'bg-[var(--gold)] text-[var(--on-gold)]'
                      : 'bg-[var(--tint-blue-bg-strong)] text-[var(--tint-blue-fg)]'
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
                    <div className="pb-2.5 border-b border-[var(--border-card)] flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-extrabold text-[var(--text-1)] text-xs truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-xs text-[var(--run)] font-semibold mt-0.5">
                          {currentUser.escalao}
                        </div>
                      </div>
                      {currentUser.nif && (
                        <span className="font-mono text-xs text-[var(--text-3)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border-card)]">
                          NIF {currentUser.nif}
                        </span>
                      )}
                    </div>

                    {/* Alternador de ambiente: azul e branco / azul-marinho */}
                    <div>
                      <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Ambiente de Design</span>
                        <span className="text-[var(--run)] font-bold capitalize">
                          {themeMode === 'dark' ? 'Azul-marinho' : 'Azul e branco'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-[var(--surface-raised)] p-1 rounded-xl border border-[var(--border-card)]">
                        <button
                          type="button"
                          onClick={() => setThemeMode('balanced')}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            themeMode === 'balanced'
                              ? 'bg-[var(--run)] text-[var(--on-accent)] shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          Azul e branco
                        </button>
                        <button
                          type="button"
                          onClick={() => setThemeMode('dark')}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            themeMode === 'dark'
                              ? 'bg-[var(--run)] text-[var(--on-accent)] shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          Azul-marinho
                        </button>
                      </div>
                    </div>

                    {/* Alternador de vista (apenas para quem tem perfil de administrador) */}
                    {currentUser.role === 'admin' && (
                    <div>
                      <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Modo de Visualização
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 bg-[var(--surface-raised)] p-1 rounded-xl border border-[var(--border-card)]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('athlete')
                            setMenuOpen(false)
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeRole === 'athlete'
                              ? 'bg-[var(--run)] text-[var(--on-accent)] shadow-xs'
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
                              ? 'bg-[var(--gold)] text-[var(--on-gold)] font-black shadow-xs'
                              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Admin
                        </button>
                      </div>
                    </div>

                    )}

                    {/* Mudar de utilizador (demonstração) */}
                    <div>
                      <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Mudar de utilizador (demo)
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
                                  ? 'bg-[var(--tint-blue-bg-strong)] text-[var(--tint-blue-fg)] font-bold border-[var(--tint-blue-border)]'
                                  : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-1)]'
                              }`}
                            >
                              <div className="truncate pr-1">
                                <div className="truncate">{p.name}</div>
                                <div className="text-xs text-[var(--text-3)] font-normal">
                                  {p.escalao} {p.dependents.length > 0 ? `• +${p.dependents.length} filho(a)` : ''}
                                </div>
                              </div>
                              {selected && (
                                <Check className="w-3.5 h-3.5 text-[var(--run)] shrink-0 ml-1.5" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Atalho para a Minha Ficha */}
                    <div className="pt-2 border-t border-[var(--border-card)]">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/perfil')
                          setMenuOpen(false)
                        }}
                        className="w-full text-center text-xs font-bold text-[var(--run)] hover:underline cursor-pointer py-1"
                      >
                        O meu perfil e crianças →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
