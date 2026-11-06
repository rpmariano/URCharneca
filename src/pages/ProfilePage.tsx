import React, { useMemo, useState } from 'react'
import { Baby, ChevronDown, Link2, Pencil, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateAge, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { AthleteForm, ChildForm, emptyChild } from '../components/PeopleForms'
import { Avatar, Button, Card, EmptyState, Field, KIND_COLOR, KindBadge, PageHeader, SectionTitle, Tag, inputClass } from '../components/ui'

/** Perfil do atleta (/perfil): inscrições, crianças a cargo e dados pessoais. */
export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    profiles,
    youthAthletes,
    races,
    registrations,
    updateProfile,
    addYouthAthlete,
    updateYouthAthlete,
    removeYouthAthlete,
    associateChildToAdult,
    disassociateChildFromAdult,
  } = useApp()
  const today = todayISO()
  const [raceId, setRaceId] = useState<string | null>(null)
  const [showData, setShowData] = useState(false)
  const [childMode, setChildMode] = useState<'none' | 'new' | 'link'>('none')
  const [editingChild, setEditingChild] = useState<string | null>(null)
  const [linkId, setLinkId] = useState('')

  const myChildren = useMemo(
    () => youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)),
    [youthAthletes, currentUser.id]
  )
  const linkable = youthAthletes.filter((c) => !c.associated_adult_ids.includes(currentUser.id) && c.associated_adult_ids.length < 2)

  const myRegs = useMemo(() => {
    const childIds = new Set(myChildren.map((c) => c.id))
    return registrations
      .filter(
        (r) =>
          r.status !== 'cancelled' &&
          ((!r.is_dependent && r.athlete_id === currentUser.id) || (r.is_dependent && childIds.has(r.dependent_id || '')))
      )
      .map((r) => ({ reg: r, race: races.find((x) => x.id === r.race_id) }))
      .filter((x): x is { reg: typeof x.reg; race: NonNullable<typeof x.race> } => Boolean(x.race && x.race.date >= today))
      .sort((a, b) => a.race.date.localeCompare(b.race.date))
  }, [registrations, races, myChildren, currentUser.id, today])

  const selectedRace = raceId ? races.find((r) => r.id === raceId) || null : null
  const { id: _id, dependents: _deps, ...profileValue } = currentUser

  return (
    <div className="space-y-6 pb-10 stagger">
      <PageHeader eyebrow="O meu perfil" title={currentUser.name} />
      <div className="flex items-center gap-3 -mt-2">
        <Avatar name={currentUser.name} size={44} />
        <div className="text-xs text-[var(--text-3)] space-y-0.5">
          <div>
            {currentUser.escalao} · {calculateAge(currentUser.birth_date)} anos
          </div>
          <Tag tone={currentUser.role === 'admin' ? 'warn' : 'neutral'}>{currentUser.role === 'admin' ? 'Administrador' : 'Atleta'}</Tag>
        </div>
      </div>

      {/* Inscrições */}
      <section className="space-y-2.5">
        <SectionTitle title="As minhas inscrições" count={myRegs.length} />
        {myRegs.length === 0 ? (
          <EmptyState text="Sem inscrições em provas futuras." />
        ) : (
          <div className="space-y-2">
            {myRegs.map(({ reg, race }) => (
              <Card key={reg.id} interactive accent={KIND_COLOR[race.category]} className="p-3 flex items-center gap-3" onClick={() => setRaceId(race.id)}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <KindBadge kind={race.category} />
                    {reg.is_dependent && <Tag tone="warn">{reg.athlete_name.split(' ')[0]}</Tag>}
                  </div>
                  <div className="text-sm font-bold text-[var(--text-1)] truncate">{race.title}</div>
                  <div className="text-xs text-[var(--text-3)]">
                    {formatShortDate(race.date)} · {reg.distance}
                  </div>
                </div>
                <Tag tone={reg.status === 'interested' ? 'warn' : 'ok'}>{reg.status === 'interested' ? 'Pendente' : 'Confirmado'}</Tag>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Crianças */}
      <section className="space-y-2.5">
        <SectionTitle title="Crianças a meu cargo" count={myChildren.length} />
        <p className="text-xs text-[var(--text-3)] -mt-1">
          Podes inscrevê-las nas provas abertas a crianças e na carrinha. Cada criança pode ter até 2 adultos responsáveis.
        </p>

        {myChildren.map((child) => {
          const others = child.associated_adult_ids
            .filter((id) => id !== currentUser.id)
            .map((id) => profiles.find((p) => p.id === id)?.name)
            .filter(Boolean)
          const soleGuardian = child.associated_adult_ids.length === 1
          if (editingChild === child.id) {
            return (
              <Card key={child.id} className="p-4">
                <ChildForm
                  initial={child}
                  submitLabel="Guardar"
                  onSubmit={(v) => {
                    updateYouthAthlete({ ...child, ...v })
                    setEditingChild(null)
                  }}
                  onCancel={() => setEditingChild(null)}
                />
              </Card>
            )
          }
          return (
            <Card key={child.id} className="p-3.5 space-y-2.5">
              <div className="flex items-center gap-3">
                <Avatar name={child.name} child />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text-1)] truncate">{child.name}</div>
                  <div className="text-xs text-[var(--text-3)]">
                    {child.escalao} · {calculateAge(child.birth_date)} anos
                    {others.length > 0 && ` · com ${others.join(', ')}`}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${child.name}`}
                  onClick={() => setEditingChild(child.id)}
                  className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-raised)] cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                {soleGuardian ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => window.confirm(`Apagar o perfil de ${child.name} e as suas inscrições?`) && removeYouthAthlete(child.id)}
                  >
                    Apagar perfil
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => disassociateChildFromAdult(child.id, currentUser.id)}>
                    Deixar de ser responsável
                  </Button>
                )}
              </div>
            </Card>
          )
        })}

        {childMode === 'new' && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-1)]">Novo perfil infantil</h3>
            <ChildForm
              initial={emptyChild()}
              submitLabel="Adicionar criança"
              onSubmit={(v) => {
                addYouthAthlete(v, [currentUser.id])
                setChildMode('none')
              }}
              onCancel={() => setChildMode('none')}
            />
          </Card>
        )}

        {childMode === 'link' && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-1)]">Associar criança já registada</h3>
            <p className="text-xs text-[var(--text-3)]">Para o 2º responsável (ex: mãe ou pai) quando a criança já existe na equipa.</p>
            <Field label="Criança">
              <select className={inputClass} value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Escolher…</option>
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.escalao})
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={!linkId}
                onClick={() => {
                  if (associateChildToAdult(linkId, currentUser.id).success) {
                    setLinkId('')
                    setChildMode('none')
                  }
                }}
              >
                Associar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setChildMode('none')}>
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {childMode === 'none' && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setChildMode('new')}>
              <Plus className="w-3.5 h-3.5" /> Adicionar criança
            </Button>
            <Button variant="secondary" size="sm" disabled={linkable.length === 0} onClick={() => setChildMode('link')}>
              <Link2 className="w-3.5 h-3.5" /> Associar existente
            </Button>
          </div>
        )}
        {myChildren.length === 0 && childMode === 'none' && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <Baby className="w-3.5 h-3.5" /> Ainda não tens crianças associadas.
          </p>
        )}
      </section>

      {/* Dados pessoais */}
      <section className="space-y-2.5">
        <button
          type="button"
          onClick={() => setShowData((v) => !v)}
          aria-expanded={showData}
          className="w-full min-h-11 flex items-center justify-between cursor-pointer"
        >
          <SectionTitle title="Os meus dados" />
          <ChevronDown className={`w-4 h-4 text-[var(--text-3)] transition-transform ${showData ? 'rotate-180' : ''}`} />
        </button>
        {showData && (
          <Card className="p-4">
            <AthleteForm
              key={currentUser.id}
              initial={profileValue}
              submitLabel="Guardar dados"
              onSubmit={(v) => updateProfile({ ...currentUser, ...v, role: currentUser.role })}
            />
          </Card>
        )}
      </section>

      {selectedRace && <RaceDetailModal race={selectedRace} onClose={() => setRaceId(null)} />}
    </div>
  )
}
