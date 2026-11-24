import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { ActivityKind } from '../types'
import { REG_STATUS_LABELS, TRANSPORT_LABELS } from '../types'
import { todayISO } from '../utils/dates'
import { raceDisplayTitle, tidyText } from '../utils/display'
import { ActivityRow, countdownLabel } from '../components/ActivityItems'
import { useDesktopShell } from '../layout/useDesktopShell'
import { BP, useMediaQuery } from '../layout/useMediaQuery'
import { AppHeader, HeaderSegmented } from '../components/AppHeader'
import { EmptyState, KindMark, SectionTitle, Tag, kindOfEvent } from '../components/ui'

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
  /** quem está inscrito: o próprio ('me') ou o id da criança */
  person: string
  tag: { label: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }
  to: string
}

/** Inscrições (/inscricoes): provas em que o utilizador (ou as suas crianças) está inscrito e presenças em treinos e eventos. */
export const RegistrationsPage: React.FC = () => {
  const { currentUser, youthAthletes, races, events, registrations } = useApp()
  const navigate = useNavigate()
  const today = todayISO()
  const desktop = useDesktopShell()
  const sideBySide = useMediaQuery(BP.xl) && desktop
  const [person, setPerson] = useState<string>('all')
  const [query, setQuery] = useState('')

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
        title: raceDisplayTitle(race),
        detail: `${r.distance} · ${TRANSPORT_LABELS[r.transport_mode].short}`,
        who: r.is_dependent ? r.athlete_name : undefined,
        person: r.is_dependent ? r.dependent_id || r.athlete_id : 'me',
        tag: REG_STATUS_LABELS[r.status],
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
        title: tidyText(e.title),
        detail: tidyText(e.location),
        person: 'me',
        tag: mine.status === 'going' ? { label: 'Vou', tone: 'ok' } : { label: 'Talvez', tone: 'warn' },
        to: `/evento/${e.id}`,
      })
    }
    return out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [registrations, races, events, youthAthletes, currentUser.id])

  // Pessoas com inscrições (eu e as crianças), para o filtro
  const people = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      if (!map.has(e.person)) map.set(e.person, e.person === 'me' ? 'Eu' : (e.who || 'Criança').split(' ')[0])
    }
    return [...map.entries()].sort((a, b) => (a[0] === 'me' ? -1 : b[0] === 'me' ? 1 : a[1].localeCompare(b[1], 'pt')))
  }, [entries])
  const q = query.trim().toLowerCase()
  const filtered = entries.filter(
    (e) =>
      (person === 'all' || e.person === person) &&
      (!q || e.title.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q) || (e.who || '').toLowerCase().includes(q))
  )
  const upcoming = filtered.filter((e) => e.date >= today)
  const past = filtered.filter((e) => e.date < today).reverse()
  const filtering = person !== 'all' || q !== ''

  /** Lista de uma das duas secções (próximas ou passadas): linhas em grelha com o bloco de data */
  const renderList = (which: 'upcoming' | 'past', items: Entry[]) =>
    items.length === 0 ? (
      <EmptyState
        title={filtering ? 'Nada encontrado' : which === 'upcoming' ? 'Ainda sem inscrições' : 'Sem atividades passadas'}
        text={
          filtering
            ? 'Não há inscrições com este filtro. Experimenta outra pessoa ou outra pesquisa.'
            : which === 'upcoming'
            ? 'Quando te inscreveres numa prova ou confirmares presença num treino, aparece aqui.'
            : 'As provas e treinos em que participaste vão aparecer aqui.'
        }
        action={filtering ? 'Limpar filtros' : which === 'upcoming' ? 'Explorar provas' : undefined}
        onAction={() => {
          if (filtering) {
            setPerson('all')
            setQuery('')
          } else navigate('/?tipo=provas')
        }}
      />
    ) : (
      <div className="rule-list">
        {items.map((e) => {
          const countdown = countdownLabel(e.date)
          const who = e.who ? e.who.split(' ')[0] : 'Eu'
          return (
            <ActivityRow
              key={e.key}
              date={e.date}
              past={which === 'past'}
              title={e.title}
              lines={[
                <>
                  <span className="t-strong text-[var(--text-1)]">{who}</span>
                  {` · ${e.time}${countdown ? ` · ${countdown}` : ''}`}
                </>,
                <span className="inline-flex items-center gap-2">
                  <KindMark kind={e.kind} />
                  {e.detail}
                </span>,
              ]}
              tags={<Tag tone={which === 'past' ? 'neutral' : e.tag.tone}>{e.tag.label}</Tag>}
              imageUrl={e.imageUrl}
              onOpen={() => navigate(e.to)}
              ariaLabel={[e.title, e.date.split('-').reverse().join('/'), who, e.tag.label].join(', ')}
            />
          )
        })}
      </div>
    )

  const personOptions = [{ value: 'all', label: 'Todos' }, ...people.map(([id, label]) => ({ value: id, label }))]

  return (
    // Próximas e Passadas uma a seguir à outra; em computador largo (>= 1280 px) lado a lado (page-wide)
    <div className={`${sideBySide ? 'page-wide' : 'page-read'} px-5 pb-28 space-y-7`}>
      <AppHeader title="Minhas inscrições" className="-mx-5">
        {entries.length > 0 && (
          <div className="px-5 pb-5 pt-1 space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6 lg:space-y-0 lg:items-end">
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="t-small t-strong text-[var(--hdr-fg)]">Pesquisar</span>
              <input
                type="search"
                className="w-full h-12 px-3.5 border-2 border-[#ffffff] bg-[#ffffff] t-body placeholder:text-[#4d5a70]"
                style={{ color: '#0d1726', outlineColor: '#ffffff' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome da prova, pessoa ou local"
              />
            </label>
            {people.length > 1 && (
              <HeaderSegmented label="Filtrar por pessoa" value={person} onChange={setPerson} options={personOptions} />
            )}
          </div>
        )}
      </AppHeader>

      {sideBySide ? (
        <div className="grid grid-cols-2 gap-x-10 items-start">
          <section className="min-w-0" aria-labelledby="insc-prox">
            <div id="insc-prox"><SectionTitle title="Próximas" count={upcoming.length} /></div>
            {renderList('upcoming', upcoming)}
          </section>
          <section className="min-w-0" aria-labelledby="insc-pass">
            <div id="insc-pass"><SectionTitle title="Passadas" count={past.length} /></div>
            {renderList('past', past)}
          </section>
        </div>
      ) : (
        <>
          <section aria-labelledby="insc-prox">
            <div id="insc-prox"><SectionTitle title="Próximas" count={upcoming.length} /></div>
            {renderList('upcoming', upcoming)}
          </section>
          <section aria-labelledby="insc-pass">
            <div id="insc-pass"><SectionTitle title="Passadas" count={past.length} /></div>
            {renderList('past', past)}
          </section>
        </>
      )}
    </div>
  )
}