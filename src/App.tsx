import React, { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { AppBackground } from './components/AppBackground'
import { HomePage } from './pages/HomePage'
import { OPEN_CREATE_RACE_EVENT } from './utils/appEvents'

// Divisão de código por rotas com React.lazy para carregamento inicial ultra-rápido
const RacesPage = lazy(() =>
  import('./pages/RacesPage').then((m) => ({ default: m.RacesPage }))
)
const TrainingsPage = lazy(() =>
  import('./pages/TrainingsPage').then((m) => ({ default: m.TrainingsPage }))
)
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
)
const TeamProfilePage = lazy(() =>
  import('./pages/TeamProfilePage').then((m) => ({ default: m.TeamProfilePage }))
)
const CreateRaceModal = lazy(() =>
  import('./components/CreateRaceModal').then((m) => ({ default: m.CreateRaceModal }))
)

const PageFallback: React.FC = () => (
  <div className="py-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-150">
    <div className="w-7 h-7 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
    <span className="text-xs text-[var(--text-3)] font-semibold">A carregar...</span>
  </div>
)

const AppShell: React.FC = () => {
  const { toasts } = useApp()
  const [globalCreateRaceOpen, setGlobalCreateRaceOpen] = useState(false)

  // Instância única do modal "Criar Prova" (FAB, página Corridas, etc.)
  useEffect(() => {
    const handleOpen = () => setGlobalCreateRaceOpen(true)
    window.addEventListener(OPEN_CREATE_RACE_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_CREATE_RACE_EVENT, handleOpen)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col relative text-[var(--text-1)] selection:bg-sky-500/20">
      {/* Fundo Atmosférico IronCoach: Iluminação Ambiente + Curvas Topográficas */}
      <AppBackground />

      <Header />

      {/*
        Área Principal de Conteúdo.
        NOTA: sem z-index de propósito — um z-index aqui criaria um stacking context
        que prenderia os modais por baixo do Header/BottomNav. Os modais usam <Sheet>
        (portal para document.body).
      */}
      <main className="flex-1 px-4 pt-[64px] pb-24 max-w-[480px] w-full mx-auto relative">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/corridas" element={<RacesPage />} />
            <Route path="/treinos" element={<TrainingsPage />} />
            <Route path="/avisos" element={<NotificationsPage />} />
            <Route path="/perfil" element={<TeamProfilePage />} />
            <Route path="/equipa" element={<TeamProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Dock Inferior: Início | Corridas | [+] | Agenda | Perfil */}
      <BottomNav />

      {globalCreateRaceOpen && (
        <Suspense fallback={null}>
          <CreateRaceModal onClose={() => setGlobalCreateRaceOpen(false)} />
        </Suspense>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] z-[110] space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl border-2 bg-[var(--bg-sheet)] animate-in slide-in-from-bottom-2 fade-in duration-200 ${
                t.type === 'warning'
                  ? 'text-[var(--tint-amber-fg)] border-[var(--tint-amber-border)]'
                  : t.type === 'info'
                  ? 'text-[var(--text-1)] border-[var(--border-card-strong)]'
                  : 'text-[var(--tint-emerald-fg)] border-[var(--tint-emerald-border)]'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
