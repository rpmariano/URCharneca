import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { AppBackground } from './components/AppBackground'
import { HomePage } from './pages/HomePage'
import { OPEN_EDITOR_EVENT, type EditorRequest } from './utils/appEvents'

const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const CreateRaceModal = lazy(() => import('./components/CreateRaceModal').then((m) => ({ default: m.CreateRaceModal })))
const CreateEventModal = lazy(() => import('./components/CreateEventModal').then((m) => ({ default: m.CreateEventModal })))
const CreateNoticeModal = lazy(() => import('./components/CreateNoticeModal').then((m) => ({ default: m.CreateNoticeModal })))

const PageFallback: React.FC = () => (
  <div className="py-20 flex justify-center">
    <div className="w-7 h-7 rounded-full border-2 border-[var(--run)] border-t-transparent animate-spin" aria-label="A carregar" />
  </div>
)

/** Instância única dos formulários de criação/edição, abertos via `openEditor()` */
const EditorHost: React.FC = () => {
  const { isAdminView, showToast } = useApp()
  const [req, setReq] = useState<EditorRequest | null>(null)

  useEffect(() => {
    const handler = (e: Event) => setReq((e as CustomEvent<EditorRequest>).detail)
    window.addEventListener(OPEN_EDITOR_EVENT, handler)
    return () => window.removeEventListener(OPEN_EDITOR_EVENT, handler)
  }, [])

  // Treinos, eventos e comunicados são exclusivos de administradores
  useEffect(() => {
    if (req && req.kind !== 'race' && !isAdminView) {
      showToast('Apenas administradores podem criar treinos, eventos e comunicados.', 'warning')
      setReq(null)
    }
  }, [req, isAdminView, showToast])

  if (!req) return null
  const close = () => setReq(null)
  return (
    <Suspense fallback={null}>
      {req.kind === 'race' && <CreateRaceModal key={req.race?.id || 'new'} race={req.race} onClose={close} />}
      {req.kind === 'event' && isAdminView && (
        <CreateEventModal key={req.event?.id || 'new'} event={req.event} defaultType={req.eventType} onClose={close} />
      )}
      {req.kind === 'notice' && isAdminView && <CreateNoticeModal relatedRaceId={req.relatedRaceId} onClose={close} />}
    </Suspense>
  )
}

const AppShell: React.FC = () => {
  const { toasts } = useApp()
  return (
    <div className="min-h-dvh flex flex-col relative text-[var(--text-1)]">
      <AppBackground />
      <Header />
      {/* Sem z-index de propósito: os modais usam <Sheet> (portal para document.body) */}
      <main className="flex-1 px-4 pt-[64px] pb-24 max-w-[480px] w-full mx-auto relative">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/atividades" element={<ActivitiesPage />} />
            <Route path="/comunicados" element={<NotificationsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* Rotas antigas */}
            <Route path="/corridas" element={<Navigate to="/atividades?tipo=provas" replace />} />
            <Route path="/treinos" element={<Navigate to="/atividades?tipo=training" replace />} />
            <Route path="/avisos" element={<Navigate to="/comunicados" replace />} />
            <Route path="/equipa" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
      <EditorHost />

      {toasts.length > 0 && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] z-[110] space-y-2 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl border bg-[var(--bg-sheet)] ${
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

export const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  </AppProvider>
)

export default App
