import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ActivityKind } from '../types'
import { TRANSPORT_LABELS } from '../types'
import { formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { ActivityCover } from '../components/ActivityCover'
import { countdownLabel } from '../components/ActivityItems'
import { useDesktopShell } from '../layout/useDesktopShell'
import { BP, useMediaQuery } from '../layout/useMediaQuery'
import { EmptyState, PageHeader, SectionTitle, Segmented, Tag, kindOfEvent } from '../components/ui'

interface Entry {
  key: string
  date: string
  time: string
  kind: ActivityKind
  seed: string
  imageUrl?: string
  title: string
  detail: string
  who?: string
  tag: { label: string; tone: 'ok' | 'warn' | 'info' }
  to: string
}

/** Inscrições (/inscricoes): provas em que o utilizador (ou as suas crianças) está inscrito e presenças em treinos e eventos. */
export const RegistrationsPage: React.FC = () => {
  const { currentUser, youthAthletes, races, events, registrations } = useApp()
  const navigate = useNavigate()
  const today = todayISO()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const desktop = useDesktopShell()
  const sideBySide = useMediaQuery(BP.xl) && desktop

  const entries = useMemo<Entry[]>(() => {
    const childIds = new Set(youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)).map((c) => c.id))
    const out: Entry[] = []
    for (const r of registrations) {
      if (r.status === 'cancelled') continue
      const mine =
        (!r.is_dependent && r.athlete_id === currentUser.id) ||
        (r.is_dependent &&
          (childIds.has(r.dependent_id || '') || (Boolean(currentUser.is_minor_account) && r.dependent_id === currentUser.id)))
      if (!mine) continue
      const race = races.find((x) => x.id === r.race_id)
      if (!race) continue
      out.push({
        key: `r-${r.id}`,
        date: race.date,
        time: race.start_time,
        kind: race.category,
        seed: race.id,
        imageUrl: race.image_url,
        title: race.title,
        detail: `${r.distance} · ${TRANSPORT_LABELS[r.transport_mode].short}`,
        who: r.is_dependent ? r.athlete_name : undefined,
        tag:
          r.status === 'interested'
            ? { label: 'Aguarda o clube', tone: 'warn' }
            : r.status === 'self_enrolled'
            ? { label: 'Vais', tone: 'info' }
            : { label: 'Inscrito', tone: 'ok' },
        to: `/prova/${race.id}`,
      })
    }
    for (const e of events) {
      const mine = e.attendees.find((a) => a.athlete_id === currentUser.id)
      if (!mine || mine.status === 'not_going') continue
      out.push({
        key: `e-${e.id}`,
        date: e.date,
        time: e.time,
        kind: kindOfEvent(e),
        seed: e.id,
        imageUrl: e.image_url,
        title: e.title,
        detail: e.location,
        tag: mine.status === 'going' ? { label: 'Vais', tone: 'ok' } : { label: 'Talvez', tone: 'warn' },
        to: `/evento/${e.id}`,
      })
    }
    return out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [registrations, races, events, youthAthletes, currentUser.id])

  const upcoming = entries.filter((e) => e.date >= today)
  const past = entries.filter((e) => e.date < today).reverse()
  const list = tab === 'upcoming' ? upcoming : past

  /** Lista de uma das duas vistas (próximas ou passadas) */
  const renderList = (which: 'upcoming' | 'past', items: Entry[]) =>
    items.length === 0 ? (
      <EmptyState
        icon={Ticket}
        title={which === 'upcoming' ? 'Ainda sem inscrições' : 'Sem atividades passadas'}
        text={
          which === 'upcoming'
            ? 'Quando te inscreveres numa prova ou confirmares presença num treino, aparece aqui.'
            : 'As provas e treinos em que participaste vão aparecer aqui.'
        }
        action={which === 'upcoming' ? 'Explorar provas' : undefined}
        onAction={() => navigate('/?tipo=provas')}
      />
    ) : (
      <div className="divide-soft">
        {items.map((e) => {
          const countdown = countdownLabel(e.date)
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => navigate(e.to)}
              className={`w-full py-4 flex items-center gap-4 text-left pressable ${which === 'past' ? 'opacity-70' : ''}`}
            >
              <ActivityCover kind={e.kind} seed={e.seed} imageUrl={e.imageUrl} className="w-[72px] h-[72px] rounded-xl shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="t-body t-strong text-[var(--text-1)] line-clamp-2">{e.title}</span>
                <span className="block t-small text-[var(--text-3)] truncate">
                  {formatShortDate(e.date)} · {e.time}
                  {countdown ? ` · ${countdown}` : ''}
                </span>
                <span className="block t-small text-[var(--text-3)] truncate">
                  {e.who ? `${e.who.split(' ')[0]} · ` : ''}
                  {e.detail}
                </span>
              </span>
              <Tag tone={e.tag.tone}>{e.tag.label}</Tag>
            </button>
          )
        })}
      </div>
    )

  return (
    // Separadores Próximas/Passadas; em computador largo (>= 1280 px) as duas listas lado a lado (page-wide)
    <div className={`${sideBySide ? 'page-wide' : 'page-read'} px-5 pb-28 space-y-5`}>
      <PageHeader title="Inscrições" />
      {sideBySide ? (
        <div className="grid grid-cols-2 gap-x-8 xl:gap-x-12 items-start pt-2">
          <section className="space-y-3 min-w-0" aria-label="Próximas">
            <SectionTitle title="Próximas" count={upcoming.length} />
            {renderList('upcoming', upcoming)}
          </section>
          <section className="space-y-3 min-w-0" aria-label="Passadas">
            <SectionTitle title="Passadas" count={past.length} />
            {renderList('past', past)}
          </section>
        </div>
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'upcoming', label: `Próximas (${upcoming.length})` },
              { value: 'past', label: `Passadas (${past.length})` },
            ]}
          />
          {renderList(tab, list)}
        </>
      )}
    </div>
  )
}
