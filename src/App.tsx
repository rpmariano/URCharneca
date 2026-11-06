import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import { BottomNav } from './components/BottomNav'
import { ExplorePage } from './pages/ExplorePage'
import { OPEN_EDITOR_EVENT, type EditorRequest } from './utils/appEvents'

const RegistrationsPage = lazy(() => import('./pages/RegistrationsPage').then((m) => ({ default: m.RegistrationsPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const RaceDetailPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.RaceDetailPage })))
const EventDetailPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.EventDetailPage })))
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

/** Volta ao topo ao mudar de página (não ao mudar só os filtros da mesma página). */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

import { Intro } from './components/Intro'

const TOAST_ICON = { success: CircleCheck, info: Info, warning: CircleAlert }

const AppShell: React.FC = () => {
  const { toasts } = useApp()
  const { pathname } = useLocation()
  // As páginas de detalhe têm a sua própria barra de ação fixa em vez da navegação
  const isDetail = pathname.startsWith('/prova/') || pathname.startsWith('/evento/')

  return (
    <div className="min-h-dvh flex flex-col relative text-[var(--text-1)]">
      <ScrollToTop />
      {/* Sem z-index de propósito: os modais usam <Sheet> (portal para document.body) */}
      <main className="flex-1 w-full relative">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route path="/inscricoes" element={<RegistrationsPage />} />
            <Route path="/comunicados" element={<NotificationsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/prova/:id" element={<RaceDetailPage />} />
            <Route path="/evento/:id" element={<EventDetailPage />} />
            {/* Rotas antigas */}
            <Route path="/atividades" element={<LegacyActivities />} />
            <Route path="/corridas" element={<Navigate to="/?tipo=provas" replace />} />
            <Route path="/treinos" element={<Navigate to="/?tipo=training" replace />} />
            <Route path="/avisos" element={<Navigate to="/comunicados" replace />} />
            <Route path="/equipa" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isDetail && <BottomNav />}
      <EditorHost />
      <Intro />

      <div
        className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[440px] z-[110] space-y-2 pointer-events-none bottom-[calc(96px+env(safe-area-inset-bottom,0px))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.type] || CircleCheck
          return (
            <div
              key={t.id}
              className="sheet-in px-4 py-3 rounded-xl t-small t-strong shadow-[var(--shadow-float)] bg-[var(--text-1)] text-[var(--bg-app)] flex items-center gap-3"
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{t.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** `/atividades?tipo=…` (rota antiga) passa a abrir Explorar com a mesma categoria. */
const LegacyActivities: React.FC = () => {
  const { search } = useLocation()
  return <Navigate to={`/${search}`} replace />
}

export const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  </AppProvider>
)

export default App
