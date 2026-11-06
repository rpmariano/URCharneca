import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCheck, ChevronRight, Inbox, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatShortDate } from '../utils/formatters'
import { openCreateNotice } from '../utils/appEvents'
import { Avatar, Button, EmptyState, PageHeader, Segmented } from '../components/ui'

/** Comunicados da equipa (/comunicados), em lista tipo caixa de entrada. Só administradores publicam. */
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
  const navigate = useNavigate()
  const focusId = (location.state as { focusId?: string } | null)?.focusId
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [expanded, setExpanded] = useState<string | null>(focusId || null)

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

  return (
    <div className="px-5 pb-28 space-y-5">
      <PageHeader
        title="Comunicados"
        action={
          isAdminView ? (
            <Button size="sm" onClick={() => openCreateNotice()}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Novo
            </Button>
          ) : undefined
        }
      />

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `Todos (${notifications.length})` },
          { value: 'unread', label: `Por ler (${unread})` },
        ]}
      />

      {unread > 0 && (
        <Button size="sm" variant="ghost" onClick={markAllNotificationsRead} className="-ml-4">
          <CheckCheck className="w-4 h-4" aria-hidden="true" /> Marcar todos como lidos
        </Button>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'unread' ? 'Está tudo lido' : 'Sem comunicados'}
          text={filter === 'unread' ? 'Não tens comunicados por ler.' : 'Os avisos da equipa vão aparecer aqui.'}
          action={filter === 'unread' ? 'Ver todos' : undefined}
          onAction={() => setFilter('all')}
        />
      ) : (
        <div className="divide-soft">
          {list.map((n) => {
            const isUnread = !n.read_by.includes(currentUser.id)
            const isOpen = expanded === n.id
            const related = n.related_race_id ? races.find((r) => r.id === n.related_race_id) : undefined
            return (
              <article key={n.id} id={`notice-${n.id}`} className="py-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setExpanded(isOpen ? null : n.id)
                    markNotificationRead(n.id)
                  }}
                  className="w-full py-3 flex items-start gap-4 text-left cursor-pointer"
                >
                  <Avatar name={n.created_by_name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 t-small text-[var(--text-3)]">
                      {n.pinned && <Pin className="w-3.5 h-3.5 text-[var(--gold-ink)] shrink-0" aria-label="Fixado" />}
                      <span className="truncate">{n.created_by_name}</span>
                      <span className="shrink-0">· {formatShortDate(n.created_at.slice(0, 10))}</span>
                    </span>
                    <span className={`block t-body text-[var(--text-1)] ${isUnread ? 't-strong' : ''}`}>{n.title}</span>
                    <span className={`t-small text-[var(--text-3)] whitespace-pre-line ${isOpen ? 'block pt-1' : 'line-clamp-2'}`}>{n.message}</span>
                  </span>
                  {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-[var(--run)] shrink-0 mt-2" aria-label="Por ler" role="img" />}
                </button>
                {isOpen && (related || isAdminView) && (
                  <div className="flex flex-wrap gap-2 pb-4 pl-16">
                    {related && (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/prova/${related.id}`)} className="max-w-full">
                        <span className="truncate">{related.title}</span> <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </Button>
                    )}
                    {isAdminView && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => togglePinNotification(n.id)}>
                          {n.pinned ? <PinOff className="w-4 h-4" aria-hidden="true" /> : <Pin className="w-4 h-4" aria-hidden="true" />}
                          {n.pinned ? 'Desafixar' : 'Fixar'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => window.confirm('Remover este comunicado?') && deleteNotification(n.id)}>
                          <Trash2 className="w-4 h-4" aria-hidden="true" /> Remover
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
