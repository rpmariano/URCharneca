import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, BookOpen, Check, CircleHelp, IdCard, Link2, LogOut, Moon, Pencil, Plus, RotateCcw, ShieldCheck, Sun, Trophy, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateAge } from '../utils/formatters'
import { AthleteForm, ChildForm, emptyChild } from '../components/PeopleForms'
import { Sheet } from '../components/Sheet'
import { GLOSSARY, resetOnboarding } from '../utils/onboarding'
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
  const navigate = useNavigate()
  const {
    currentUser,
    profiles,
    youthAthletes,
    trofeuSeasons,
    activeRole,
    themeMode,
    setThemeMode,
    setActiveRole,
    setCurrentUserById,
    logout,
    resetDemoData,
    showToast,
    updateProfile,
    addYouthAthlete,
    updateYouthAthlete,
    removeYouthAthlete,
    associateChildToAdult,
    disassociateChildFromAdult,
  } = useApp()
  const [sheet, setSheet] = useState<'none' | 'data' | 'users' | 'child-new' | 'child-link' | 'glossary'>('none')
  const [editingChild, setEditingChild] = useState<string | null>(null)
  const [linkId, setLinkId] = useState('')

  const myChildren = useMemo(
    () => youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)),
    [youthAthletes, currentUser.id]
  )

  const myTrofeuHistory = useMemo(() => {
    const personIds = new Set([currentUser.id, ...myChildren.map((c) => c.id)])
    return trofeuSeasons.flatMap((s) =>
      s.athlete_standings
        .filter((st) => st.matched_profile_id && personIds.has(st.matched_profile_id))
        .map((st) => ({ ...st, edition: s.edition_number }))
    )
  }, [trofeuSeasons, currentUser.id, myChildren])
  const selfManagedMinors = useMemo(
    () => youthAthletes.filter((c) => Boolean(c.can_self_manage)),
    [youthAthletes]
  )
  const myGuardians = useMemo(() => {
    if (!currentUser.is_minor_account) return []
    const me = youthAthletes.find((c) => c.id === currentUser.id)
    if (!me) return []
    return me.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n))
  }, [currentUser, youthAthletes, profiles])

  const linkable = youthAthletes.filter((c) => !c.associated_adult_ids.includes(currentUser.id) && c.associated_adult_ids.length < 2)
  const editing = editingChild ? myChildren.find((c) => c.id === editingChild) || null : null
  const close = () => setSheet('none')

  const { id: _id, dependents: _deps, ...profileValue } = currentUser

  return (
    <div className="px-5 pb-28 space-y-8">
      <PageHeader title="Perfil" />

      {/* Cartão do atleta */}
      <section className="card-raised p-6 flex items-center gap-5">
        <Avatar name={currentUser.name} child={currentUser.is_minor_account} size={72} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="t-heading text-[var(--text-1)] truncate">{currentUser.name}</h2>
          <p className="t-small text-[var(--text-3)]">
            {currentUser.escalao} · {calculateAge(currentUser.birth_date)} anos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentUser.is_minor_account ? (
              <Tag tone="ok">Conta Jovem Autónoma</Tag>
            ) : (
              <Tag tone={currentUser.role === 'admin' ? 'warn' : 'neutral'}>
                {currentUser.role === 'admin' ? 'Administrador' : 'Atleta'}
              </Tag>
            )}
            {currentUser.dorsais_trofeu?.['2026/2027'] || currentUser.dorsal_trofeu ? (
              <Tag tone="ok">
                Troféu 26/27 · Dorsal #{currentUser.dorsais_trofeu?.['2026/2027'] || currentUser.dorsal_trofeu}
              </Tag>
            ) : currentUser.dorsais_trofeu && Object.keys(currentUser.dorsais_trofeu).length > 0 ? (
              <Tag tone="neutral">
                {(() => {
                  const [yr, num] = Object.entries(currentUser.dorsais_trofeu).sort((a, b) => b[0].localeCompare(a[0]))[0]
                  return `Troféu ${yr} · #${num}`
                })()}
              </Tag>
            ) : (
              <Tag tone="info">Sem dorsal Troféu 26/27</Tag>
            )}
          </div>
        </div>
      </section>

      {/* Classificações no Troféu de Cascais (por época) */}
      <section className="space-y-3">
        <SectionTitle
          title="Troféu de Cascais (por época)"
          action="Ver Troféu"
          onAction={() => navigate('/trofeu')}
        />
        <p className="t-small text-[var(--text-3)]">
          Este dorsal é exclusivo para as provas do Troféu de Atletismo de Cascais e muda todos os anos.
        </p>
        {currentUser.dorsais_trofeu && Object.keys(currentUser.dorsais_trofeu).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(currentUser.dorsais_trofeu)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([season, num]) => (
                <Tag key={season} tone={season === '2026/2027' ? 'ok' : 'neutral'}>
                  {season}: #{num}
                </Tag>
              ))}
          </div>
        )}
        {myTrofeuHistory.length === 0 ? (
          <div className="card p-4 space-y-2">
            <p className="t-small text-[var(--text-3)]">
              Ainda sem pontuação registada no Troféu de Cascais para este perfil ou crianças a cargo.
            </p>
            <Button size="sm" variant="secondary" onClick={() => navigate('/trofeu')}>
              <Trophy className="w-4 h-4" aria-hidden="true" /> Consultar classificações
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {myTrofeuHistory.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => navigate('/trofeu')}
                className="w-full card p-3.5 flex items-center justify-between gap-3 text-left pressable"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag tone={st.season_status === 'open' ? 'ok' : 'neutral'}>
                      {st.season} · {st.season_status === 'open' ? 'Aberto' : 'Histórico'}
                    </Tag>
                    <Tag tone={st.pos > 0 && st.pos <= 3 ? 'warn' : 'neutral'}>
                      {st.pos > 0 ? `${st.pos}º ` : 'Inscrito · '}
                      {st.escalao}
                    </Tag>
                  </div>
                  <div className="t-body t-strong text-[var(--text-1)] mt-1 truncate">{st.name}</div>
                  <div className="t-small text-[var(--text-3)]">
                    {st.stages_participated}/{st.total_season_stages} provas · {st.dorsal ? `Dorsal #${st.dorsal}` : 'Dorsal por atribuir'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="t-heading t-num text-[var(--text-1)]">{st.total}</div>
                  <div className="t-small text-[var(--text-3)]">pts</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Crianças a cargo (adultos) ou Responsáveis (se conta jovem autónoma) */}
      {currentUser.is_minor_account ? (
        <section className="space-y-2">
          <SectionTitle title="Gestão da minha conta" />
          <div className="card p-4 space-y-1.5">
            <div className="t-body t-strong text-[var(--text-1)]">Acesso jovem autónomo ativo</div>
            <p className="t-small text-[var(--text-3)]">
              O administrador autorizou esta conta para fazeres login, gerires os teus dados e inscreveres-te nas provas.
              {myGuardians.length > 0 && ` Adultos associados: ${myGuardians.join(' e ')}.`}
            </p>
          </div>
        </section>
      ) : (
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
                      <div className="t-body t-strong text-[var(--text-1)] truncate">
                        {child.name}
                        {(child.dorsais_trofeu?.['2026/2027'] || child.dorsal_trofeu) && (
                          <span className="ml-2 t-small font-normal text-[var(--run)]">
                            Troféu 26/27 #{child.dorsais_trofeu?.['2026/2027'] || child.dorsal_trofeu}
                          </span>
                        )}
                      </div>
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
      )}

      {/* Conta */}
      <section className="space-y-1">
        <SectionTitle title="Conta" />
        <div className="divide-soft">
          <ListRow
            icon={IdCard}
            title="Dados pessoais"
            description={
              currentUser.login_email
                ? `Login ativo: ${currentUser.login_email} (${currentUser.login_provider === 'google' ? 'Google' : 'Email'})`
                : 'Contactos, escalão, emergência e t-shirt'
            }
            onClick={() => setSheet('data')}
          />
          <ListRow
            icon={LogOut}
            title="Terminar sessão"
            description="Sair da conta atual e voltar ao ecrã de login"
            onClick={() => void logout()}
          />
          <ListRow icon={BookOpen} title="Glossário" description="Escalão, dorsal, carrinha, prazo e outros termos" onClick={() => setSheet('glossary')} />
          <ListRow
            icon={CircleHelp}
            title="Ver a introdução outra vez"
            description="Volta a abrir a introdução e as dicas"
            onClick={() => {
              resetOnboarding()
              showToast('A introdução abre agora.', 'info')
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

      {/* Administração & Demonstração */}
      {currentUser.role === 'admin' && (
        <section className="space-y-1">
          <SectionTitle title="Administração de Sessão" />
          <div className="divide-soft">
            <ListRow
              icon={UsersRound}
              title="Simular vista de outro utilizador autorizado"
              description="Testa a app como outro atleta ou menor autorizado pelo admin"
              onClick={() => setSheet('users')}
            />
            <ListRow
              icon={RotateCcw}
              title="Repor os dados iniciais"
              description="Restaura a base de dados do Troféu para o estado inicial"
              onClick={() => window.confirm('Repor os dados iniciais? As alterações feitas perdem-se.') && resetDemoData()}
            />
          </div>
        </section>
      )}

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

      {sheet === 'glossary' && (
        <Sheet onClose={close} ariaLabel="Glossário">
          <SheetHeader title="Glossário" subtitle="Os termos da equipa, em poucas palavras." onClose={close} />
          <dl className="flex-1 overflow-y-auto px-5 py-2 divide-soft">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="py-4">
                <dt className="t-body t-strong text-[var(--text-1)]">{g.term}</dt>
                <dd className="t-body text-[var(--text-2)] mt-0.5">{g.text}</dd>
              </div>
            ))}
          </dl>
        </Sheet>
      )}

      {sheet === 'users' && (
        <Sheet onClose={close} ariaLabel="Mudar de utilizador">
          <SheetHeader
            title="Mudar de utilizador"
            subtitle="Atletas adultos e menores autorizados pelo administrador para login próprio."
            onClose={close}
          />
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
            <div className="divide-soft">
              {profiles.filter((p) => p.login_authorized || p.role === 'admin').map((p) => {
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

            {selfManagedMinors.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-[var(--border-card)]">
                <div className="t-small t-strong text-[var(--text-2)] py-1">Menores com login próprio</div>
                <div className="divide-soft">
                  {selfManagedMinors.map((m) => {
                    const selected = m.id === currentUser.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setCurrentUserById(m.id)
                          close()
                        }}
                        className="w-full min-h-14 py-3 flex items-center gap-4 text-left cursor-pointer"
                      >
                        <Avatar name={m.name} child />
                        <span className="min-w-0 flex-1">
                          <span className={`block t-body text-[var(--text-1)] truncate ${selected ? 't-strong' : ''}`}>{m.name}</span>
                          <span className="block t-small text-[var(--text-3)] truncate">
                            Conta Jovem Autónoma · {m.escalao}
                          </span>
                        </span>
                        {selected && <Check className="w-5 h-5 text-[var(--text-1)] shrink-0" aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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
