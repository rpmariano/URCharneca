import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCheck, ChevronRight, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatShortDate } from '../utils/formatters'
import { openCreateNotice } from '../utils/appEvents'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { Button, Card, EmptyState, PageHeader, Segmented, Tag } from '../components/ui'

/** Comunicados da equipa (/comunicados). Só administradores publicam. */
export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    races,
    currentUser,
    isAdminView,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    togglePinNotification,
  } = useApp()
  const location = useLocation()
  const focusId = (location.state as { focusId?: string } | null)?.focusId
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [expanded, setExpanded] = useState<string | null>(focusId || null)
  const [raceId, setRaceId] = useState<string | null>(null)

  useEffect(() => {
    if (focusId) document.getElementById(`notice-${focusId}`)?.scrollIntoView({ block: 'center' })
  }, [focusId])

  const list = useMemo(
    () =>
      [...notifications]
        .filter((n) => filter === 'all' || !n.read_by.includes(currentUser.id))
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.created_at.localeCompare(a.created_at)),
    [notifications, filter, currentUser.id]
  )
  const unread = notifications.filter((n) => !n.read_by.includes(currentUser.id)).length
  const race = raceId ? races.find((r) => r.id === raceId) || null : null

  return (
    <div className="space-y-4 pb-10 stagger">
      <PageHeader
        eyebrow="Equipa"
        title="Comunicados"
        action={
          isAdminView ? (
            <Button size="sm" onClick={() => openCreateNotice()}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Todos (${notifications.length})` },
              { value: 'unread', label: `Por ler (${unread})` },
            ]}
          />
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllNotificationsRead} aria-label="Marcar todos como lidos">
            <CheckCheck className="w-4 h-4" />
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState text={filter === 'unread' ? 'Está tudo lido.' : 'Ainda não há comunicados.'} />
      ) : (
        <div className="space-y-2.5">
          {list.map((n) => {
            const isUnread = !n.read_by.includes(currentUser.id)
            const isOpen = expanded === n.id
            const related = n.related_race_id ? races.find((r) => r.id === n.related_race_id) : undefined
            return (
              <Card
                key={n.id}
                id={`notice-${n.id}`}
                interactive
                className="p-4 space-y-1.5"
                onClick={() => {
                  setExpanded(isOpen ? null : n.id)
                  markNotificationRead(n.id)
                }}
              >
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                  {n.pinned && <Pin className="w-3 h-3 text-[var(--run)]" />}
                  <span>{n.created_by_name}</span>
                  <span>· {formatShortDate(n.created_at.slice(0, 10))}</span>
                  {isUnread && <Tag tone="info">Novo</Tag>}
                </div>
                <h3 className={`text-sm leading-snug ${isUnread ? 'font-bold text-[var(--text-1)]' : 'font-semibold text-[var(--text-2)]'}`}>
                  {n.title}
                </h3>
                <p className={`text-xs text-[var(--text-3)] whitespace-pre-line ${isOpen ? '' : 'line-clamp-2'}`}>{n.message}</p>
                {isOpen && (
                  <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    {related && (
                      <Button size="sm" variant="secondary" onClick={() => setRaceId(related.id)}>
                        {related.title} <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {isAdminView && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => togglePinNotification(n.id)}>
                          {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          {n.pinned ? 'Desafixar' : 'Fixar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => window.confirm('Remover este comunicado?') && deleteNotification(n.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {race && <RaceDetailModal race={race} onClose={() => setRaceId(null)} />}
    </div>
  )
}
