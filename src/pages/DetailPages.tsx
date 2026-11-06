import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { RaceDetail } from '../components/RaceDetail'
import { EventDetail } from '../components/EventDetail'
import { EmptyState } from '../components/ui'

/** Volta à página anterior; se a página foi aberta por link direto, vai para Explorar. */
const useGoBack = () => {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
}

const NotFound: React.FC<{ what: string }> = ({ what }) => {
  const navigate = useNavigate()
  return (
    <div className="px-5 pt-16">
      <EmptyState
        icon={SearchX}
        title={`${what} não encontrada`}
        text="Pode ter sido removida ou o link está incompleto."
        action="Explorar atividades"
        onAction={() => navigate('/', { replace: true })}
      />
    </div>
  )
}

/** Página de detalhe de uma prova (`/prova/:id`). */
export const RaceDetailPage: React.FC = () => {
  const { id } = useParams()
  const { races } = useApp()
  const goBack = useGoBack()
  const race = races.find((r) => r.id === id)
  return race ? <RaceDetail key={race.id} race={race} onBack={goBack} /> : <NotFound what="Prova" />
}

/** Página de detalhe de um treino ou evento (`/evento/:id`). */
export const EventDetailPage: React.FC = () => {
  const { id } = useParams()
  const { events } = useApp()
  const goBack = useGoBack()
  const event = events.find((e) => e.id === id)
  return event ? <EventDetail key={event.id} event={event} onBack={goBack} /> : <NotFound what="Atividade" />
}
