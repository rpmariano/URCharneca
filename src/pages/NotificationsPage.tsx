import React, { useState, useEffect } from 'react'
import {
  BellRing,
  CheckCheck,
  Send,
  Plus,
  Bus,
  Ticket,
  Trophy,
  Megaphone,
  ChevronRight,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NotificationType, Race } from '../types'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { Sheet } from '../components/Sheet'

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    races,
    currentUser,
    isAdminView,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    sendNotification,
    showToast,
  } = useApp()

  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('general')
  const [relatedRaceId, setRelatedRaceId] = useState<string>('')

  // Abertura do formulário pedida pelo FAB (via estado de navegação, sem setTimeout)
  const routerLocation = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const state = routerLocation.state as { openCreate?: boolean } | null
    if (state?.openCreate) {
      if (isAdminView) setComposeOpen(true)
      navigate(routerLocation.pathname, { replace: true, state: null })
    }
  }, [routerLocation, navigate, isAdminView])

  const [pushPerm, setPushPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  )

  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('O teu navegador não suporta Web Push direto.', 'info')
      return
    }
    const perm = await Notification.requestPermission()
    setPushPerm(perm)
    if (perm === 'granted') {
      showToast('Notificações ativadas no dispositivo!', 'success')
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    sendNotification({
      title: title.trim(),
      message: message.trim(),
      type,
      related_race_id: relatedRaceId || undefined,
      pinned: false,
    })
    setTitle('')
    setMessage('')
    setComposeOpen(false)
  }

  const getTypeIcon = (t: NotificationType) => {
    switch (t) {
      case 'transport':
        return <Bus className="w-4 h-4 text-sky-400" />
      case 'bibs_ready':
        return <Ticket className="w-4 h-4 text-amber-400" />
      case 'race_open':
      case 'deadline':
        return <Trophy className="w-4 h-4 text-emerald-400" />
      default:
        return <Megaphone className="w-4 h-4 text-rose-400" />
    }
  }

  return (
    <div className="space-y-4 pb-8 pt-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
              Avisos da Equipa
            </h1>
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-400/30">
              URC
            </span>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Dorsais, carrinha e comunicados oficiais
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="p-2 rounded-full text-[var(--text-3)] hover:text-[var(--text-1)] bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer shadow-2xs"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}

          {isAdminView && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-md transition active:scale-95 cursor-pointer text-slate-950 bg-gradient-to-r from-rose-400 to-amber-400 border border-rose-300"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Aviso</span>
            </button>
          )}
        </div>
      </div>

      {/* Push permission strip */}
      {pushPerm !== 'granted' && (
        <div className="iron-card p-3.5 flex items-center justify-between gap-3 text-xs border-sky-400/30 bg-sky-500/10">
          <div className="flex items-center gap-2.5 text-[var(--text-2)]">
            <BellRing className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Ativa notificações push para saber quando os dorsais chegam.</span>
          </div>
          <button
            type="button"
            onClick={handleRequestPushPermission}
            className="px-3 py-1.5 rounded-full bg-sky-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer hover:bg-sky-300 transition shadow-xs"
          >
            Ativar
          </button>
        </div>
      )}

      {/* Lista de Avisos */}
      <div className="space-y-2.5">
        {notifications.map((n) => {
          const isUnread = !n.read_by.includes(currentUser.id)
          const relatedRace = n.related_race_id
            ? races.find((r) => r.id === n.related_race_id)
            : undefined

          return (
            <div
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id)
                if (relatedRace) setSelectedRace(relatedRace)
              }}
              className={`iron-card iron-card-interactive p-4 cursor-pointer space-y-2 relative overflow-hidden ${
                isUnread ? 'border-sky-400/50 shadow-md ring-1 ring-sky-400/30' : ''
              }`}
            >
              {isUnread && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-600" />
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-2)]">
                  <span className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                    {getTypeIcon(n.type)}
                  </span>
                  <span className="text-[var(--text-1)] font-bold">{n.created_by_name}</span>
                </div>
                {isUnread && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Novo
                  </span>
                )}
              </div>

              <h3 className="font-display font-bold text-sm text-[var(--text-1)]">{n.title}</h3>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">{n.message}</p>

              {relatedRace && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-sky-400">
                  <span>Ver prova: {relatedRace.title}</span>
                  <ChevronRight className="w-4 h-4 text-sky-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Novo Aviso (Admin) */}
      {composeOpen && (
        <Sheet onClose={() => setComposeOpen(false)} ariaLabel="Novo aviso">
          <div className="px-5 pt-2 pb-5 space-y-4 text-xs overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="font-display font-black text-base text-[var(--text-1)] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-rose-400" />
                Novo Aviso à Armada Azul
              </h2>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSend} className="space-y-3.5 text-[var(--text-2)]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="np-type" className="block font-semibold text-[var(--text-2)] mb-1">Tipo</label>
                  <select
                    id="np-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as NotificationType)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-[var(--text-1)] focus:border-sky-400 focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-sheet)' }}
                  >
                    <option value="general">📢 Comunicado Geral</option>
                    <option value="race_open">🏆 Inscrições Abertas</option>
                    <option value="bibs_ready">🎟️ Dorsais Levantados</option>
                    <option value="transport">🚐 Carrinha / Transporte</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="np-race" className="block font-semibold text-[var(--text-2)] mb-1">
                    Prova Associada (opcional)
                  </label>
                  <select
                    id="np-race"
                    value={relatedRaceId}
                    onChange={(e) => setRelatedRaceId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-[var(--text-1)] focus:border-sky-400 focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-sheet)' }}
                  >
                    <option value="">— Nenhuma —</option>
                    {races.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="np-title" className="block font-semibold text-[var(--text-2)] mb-1">Título *</label>
                <input
                  id="np-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dorsais da corrida de domingo disponíveis"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-sky-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="np-message" className="block font-semibold text-[var(--text-2)] mb-1">Mensagem *</label>
                <textarea
                  id="np-message"
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreve os detalhes para os atletas..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-sky-400 focus:outline-none transition"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/10 text-[var(--text-3)] hover:text-[var(--text-1)] font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-950 bg-gradient-to-r from-rose-400 to-amber-400 hover:from-rose-300 hover:to-amber-300 transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </Sheet>
      )}

      {selectedRace && (
        <RaceDetailModal race={selectedRace} onClose={() => setSelectedRace(null)} />
      )}
    </div>
  )
}
