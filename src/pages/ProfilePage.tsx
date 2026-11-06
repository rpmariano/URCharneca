import React, { useMemo, useState } from 'react'
import { Baby, Check, CircleHelp, IdCard, Link2, Moon, Pencil, Plus, RotateCcw, ShieldCheck, Sun, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateAge } from '../utils/formatters'
import { AthleteForm, ChildForm, emptyChild } from '../components/PeopleForms'
import { Sheet } from '../components/Sheet'
import { resetOnboarding } from '../utils/onboarding'
import {
  Avatar,
  Button,
  Field,
  IconButton,
  ListRow,
  PageHeader,
  SectionTitle,
  Segmented,
  SheetHeader,
  Tag,
  Toggle,
  inputClass,
} from '../components/ui'

/** Perfil (/perfil): cartão do atleta, crianças a cargo, dados pessoais, aparência e (demonstração) troca de utilizador. */
export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    profiles,
    youthAthletes,
    activeRole,
    themeMode,
    setThemeMode,
    setActiveRole,
    setCurrentUserById,
    resetDemoData,
    showToast,
    updateProfile,
    addYouthAthlete,
    updateYouthAthlete,
    removeYouthAthlete,
    associateChildToAdult,
    disassociateChildFromAdult,
  } = useApp()
  const [sheet, setSheet] = useState<'none' | 'data' | 'users' | 'child-new' | 'child-link'>('none')
  const [editingChild, setEditingChild] = useState<string | null>(null)
  const [linkId, setLinkId] = useState('')

  const myChildren = useMemo(
    () => youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)),
    [youthAthletes, currentUser.id]
  )
  const linkable = youthAthletes.filter((c) => !c.associated_adult_ids.includes(currentUser.id) && c.associated_adult_ids.length < 2)
  const editing = editingChild ? myChildren.find((c) => c.id === editingChild) || null : null
  const close = () => setSheet('none')

  const { id: _id, dependents: _deps, ...profileValue } = currentUser

  return (
    <div className="px-5 pb-28 space-y-8">
      <PageHeader title="Perfil" />

      {/* Cartão do atleta */}
      <section className="card-raised p-6 flex items-center gap-5">
        <Avatar name={currentUser.name} size={72} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="t-heading text-[var(--text-1)] truncate">{currentUser.name}</h2>
          <p className="t-small text-[var(--text-3)]">
            {currentUser.escalao} · {calculateAge(currentUser.birth_date)} anos
          </p>
          <Tag tone={currentUser.role === 'admin' ? 'warn' : 'neutral'}>{currentUser.role === 'admin' ? 'Administrador' : 'Atleta'}</Tag>
        </div>
      </section>

      {/* Crianças */}
      <section className="space-y-3">
        <SectionTitle title="Crianças a meu cargo" count={myChildren.length} />
        <p className="t-small text-[var(--text-3)]">
          Podes inscrevê-las nas provas abertas a crianças e na carrinha. Cada criança pode ter até 2 adultos responsáveis.
        </p>

        {myChildren.length === 0 ? (
          <p className="t-body text-[var(--text-3)] flex items-center gap-2 py-2">
            <Baby className="w-5 h-5 shrink-0" aria-hidden="true" /> Ainda não tens crianças associadas.
          </p>
        ) : (
          <div className="divide-soft">
            {myChildren.map((child) => {
              const others = child.associated_adult_ids
                .filter((id) => id !== currentUser.id)
                .map((id) => profiles.find((p) => p.id === id)?.name)
                .filter(Boolean)
              return (
                <div key={child.id} className="flex items-center gap-4 py-3">
                  <Avatar name={child.name} child size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body t-strong text-[var(--text-1)] truncate">{child.name}</div>
                    <div className="t-small text-[var(--text-3)]">
                      {child.escalao} · {calculateAge(child.birth_date)} anos
                    </div>
                    {others.length > 0 && <div className="t-small text-[var(--text-3)] truncate">Também a cargo de {others.join(', ')}</div>}
                  </div>
                  <IconButton label={`Editar ${child.name}`} onClick={() => setEditingChild(child.id)}>
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </IconButton>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={() => setSheet('child-new')}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Adicionar criança
          </Button>
          <Button variant="secondary" size="sm" disabled={linkable.length === 0} onClick={() => setSheet('child-link')}>
            <Link2 className="w-4 h-4" aria-hidden="true" /> Associar existente
          </Button>
        </div>
      </section>

      {/* Conta */}
      <section className="space-y-1">
        <SectionTitle title="Conta" />
        <div className="divide-soft">
          <ListRow icon={IdCard} title="Dados pessoais" description="Contactos, escalão, emergência e t-shirt" onClick={() => setSheet('data')} />
          <ListRow
            icon={CircleHelp}
            title="Ver o guia outra vez"
            description="Volta a mostrar as boas-vindas e as dicas"
            onClick={() => {
              resetOnboarding()
              showToast('Guia reposto. Está na página Explorar.', 'info')
            }}
          />
          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-6 h-6 text-[var(--text-1)] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <Toggle
                  checked={activeRole === 'admin'}
                  onChange={(on) => setActiveRole(on ? 'admin' : 'athlete')}
                  label="Vista de administrador"
                  hint="Desliga para veres a app como um atleta."
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Aparência */}
      <section className="space-y-3">
        <SectionTitle title="Aparência" />
        <Segmented
          value={themeMode === 'dark' ? 'dark' : 'balanced'}
          onChange={(v) => setThemeMode(v)}
          options={[
            {
              value: 'balanced' as const,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="w-4 h-4" aria-hidden="true" /> Claro
                </span>
              ),
            },
            {
              value: 'dark' as const,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="w-4 h-4" aria-hidden="true" /> Escuro
                </span>
              ),
            },
          ]}
        />
      </section>

      {/* Demonstração */}
      <section className="space-y-1">
        <SectionTitle title="Demonstração" />
        <div className="divide-soft">
          <ListRow icon={UsersRound} title="Mudar de utilizador" description="Experimenta a app como outro atleta" onClick={() => setSheet('users')} />
          <ListRow
            icon={RotateCcw}
            title="Repor os dados de exemplo"
            description="Apaga as alterações feitas neste dispositivo"
            onClick={() => window.confirm('Repor os dados de exemplo? As alterações feitas neste dispositivo perdem-se.') && resetDemoData()}
          />
        </div>
      </section>

      {/* Folhas */}
      {sheet === 'data' && (
        <Sheet onClose={close} ariaLabel="Dados pessoais">
          <SheetHeader title="Dados pessoais" onClose={close} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <AthleteForm
              key={currentUser.id}
              initial={profileValue}
              submitLabel="Guardar dados"
              onSubmit={(v) => {
                updateProfile({ ...currentUser, ...v, role: currentUser.role })
                close()
              }}
            />
          </div>
        </Sheet>
      )}

      {sheet === 'users' && (
        <Sheet onClose={close} ariaLabel="Mudar de utilizador">
          <SheetHeader title="Mudar de utilizador" subtitle="Só para demonstração: cada perfil vê as suas inscrições." onClose={close} />
          <div className="flex-1 overflow-y-auto px-5 py-2 divide-soft">
            {profiles.map((p) => {
              const selected = p.id === currentUser.id
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setCurrentUserById(p.id)
                    close()
                  }}
                  className="w-full min-h-14 py-3 flex items-center gap-4 text-left cursor-pointer"
                >
                  <Avatar name={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className={`block t-body text-[var(--text-1)] truncate ${selected ? 't-strong' : ''}`}>{p.name}</span>
                    <span className="block t-small text-[var(--text-3)] truncate">
                      {p.role === 'admin' ? 'Administrador' : 'Atleta'} · {p.escalao}
                      {p.dependents.length > 0 ? ` · ${p.dependents.length} ${p.dependents.length === 1 ? 'criança' : 'crianças'}` : ''}
                    </span>
                  </span>
                  {selected && <Check className="w-5 h-5 text-[var(--text-1)] shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </Sheet>
      )}

      {sheet === 'child-new' && (
        <Sheet onClose={close} ariaLabel="Novo perfil infantil">
          <SheetHeader title="Novo perfil infantil" onClose={close} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ChildForm
              initial={emptyChild()}
              submitLabel="Adicionar criança"
              onSubmit={(v) => {
                addYouthAthlete(v, [currentUser.id])
                close()
              }}
              onCancel={close}
            />
          </div>
        </Sheet>
      )}

      {sheet === 'child-link' && (
        <Sheet onClose={close} ariaLabel="Associar criança">
          <SheetHeader title="Associar criança" subtitle="Para o 2.º responsável, quando a criança já existe na equipa." onClose={close} />
          <div className="px-5 py-4 space-y-4">
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
            <Button
              block
              disabled={!linkId}
              onClick={() => {
                if (associateChildToAdult(linkId, currentUser.id).success) {
                  setLinkId('')
                  close()
                }
              }}
            >
              Associar
            </Button>
          </div>
        </Sheet>
      )}

      {editing && (
        <Sheet onClose={() => setEditingChild(null)} ariaLabel={`Editar ${editing.name}`}>
          <SheetHeader title={editing.name} subtitle="Perfil infantil" onClose={() => setEditingChild(null)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <ChildForm
              key={editing.id}
              initial={editing}
              submitLabel="Guardar"
              onSubmit={(v) => {
                updateYouthAthlete({ ...editing, ...v })
                setEditingChild(null)
              }}
            />
            {editing.associated_adult_ids.length === 1 ? (
              <Button
                variant="danger"
                block
                onClick={() => {
                  if (window.confirm(`Apagar o perfil de ${editing.name} e as suas inscrições?`)) {
                    removeYouthAthlete(editing.id)
                    setEditingChild(null)
                  }
                }}
              >
                Apagar perfil
              </Button>
            ) : (
              <Button
                variant="secondary"
                block
                onClick={() => {
                  disassociateChildFromAdult(editing.id, currentUser.id)
                  setEditingChild(null)
                }}
              >
                Deixar de ser responsável
              </Button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}
