import React, { useEffect, useRef, useState } from 'react'
import { Baby, Check, ChevronRight, X } from 'lucide-react'
import type { ActivityKind } from '../types'
import { useApp } from '../context/AppContext'
import { useOnboardingItem } from '../utils/onboarding'
import { Avatar, Button, DateBlock, KindBadge, Tag } from './ui'

/**
 * Introdução em ecrã inteiro, à primeira abertura: slides que se deslizam (ou "Seguinte"), com ilustrações
 * animadas e pequenas demonstrações em que se toca. Os administradores têm um slide a mais (gestão).
 * Pode ser vista outra vez em Perfil → "Ver a introdução outra vez".
 */
export const Intro: React.FC = () => {
  const { isAdminView, currentUser, isAuthenticated } = useApp()
  const { visible: unseen, dismiss } = useOnboardingItem(`intro-v1:${currentUser.id}`)
  const visible = unseen && isAuthenticated
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const firstButton = useRef<HTMLButtonElement>(null)

  const slides = [Welcome, Explore, Register, Kids, Follow, ...(isAdminView ? [Manage] : [])]
  const last = slides.length - 1

  useEffect(() => {
    if (!visible) return
    setIndex(0)
    track.current?.scrollTo({ left: 0 })
    firstButton.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible) return null

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }
  const onScroll = () => {
    const el = track.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }
  const next = () => (index >= last ? dismiss() : goTo(index + 1))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introdução à app"
      className="fixed inset-0 z-[120] flex justify-center lg:items-center lg:p-6 bg-[var(--bg-body-desktop)] fade-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') dismiss()
        if (e.key === 'ArrowRight') next()
        if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1)
      }}
    >
      <div className="w-full max-w-[480px] h-full lg:max-w-[520px] lg:h-[min(860px,100%)] lg:border-2 lg:border-[var(--rule-strong)] bg-[var(--bg-app)] flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 shrink-0">
          <span className="t-small t-strong text-[var(--text-1)]" aria-live="polite">
            {index + 1} de {slides.length}
          </span>
          <button
            ref={firstButton}
            type="button"
            onClick={dismiss}
            className="min-h-11 px-3 -mr-3 t-body t-strong text-[var(--text-1)] cursor-pointer inline-flex items-center gap-1"
          >
            {index >= last ? 'Fechar' : 'Saltar'} <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div
          ref={track}
          onScroll={onScroll}
          className="flex-1 min-h-0 flex overflow-x-auto scroll-row"
          style={{ scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain' }}
        >
          {slides.map((Slide, i) => (
            <div key={i} className="w-full shrink-0 h-full overflow-y-auto" style={{ scrollSnapAlign: 'center' }} aria-hidden={i !== index}>
              <Slide active={i === index} name={currentUser.nickname || currentUser.name.split(' ')[0]} />
            </div>
          ))}
        </div>

        <div className="shrink-0 px-5 pt-3 flex items-center gap-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex gap-2 flex-1" role="tablist" aria-label="Passos da introdução">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Passo ${i + 1}`}
                onClick={() => goTo(i)}
                className="h-11 flex items-center cursor-pointer"
              >
                <span
                  className="block h-2 transition-all"
                  style={{ width: i === index ? 24 : 8, background: i === index ? 'var(--run)' : 'var(--border-card-strong)' }}
                />
              </button>
            ))}
          </div>
          <Button onClick={next}>
            {index >= last ? 'Começar' : 'Seguinte'} {index < last && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

type SlideProps = { active: boolean; name: string }

/** Moldura comum: ilustração em cima, título e texto por baixo. */
const Frame: React.FC<{ art: React.ReactNode; title: string; text: string; tone?: 'blue' | 'gold' }> = ({ art, title, text, tone = 'blue' }) => (
  <div className="min-h-full flex flex-col">
    <div
      className={`mx-5 mt-2 flex-1 min-h-[260px] max-h-[380px] flex items-center justify-center relative overflow-hidden border-t-[3px] border-[var(--rule-strong)] ${
        tone === 'gold' ? 'bg-[var(--tint-amber-bg)]' : 'bg-[var(--surface-raised)]'
      }`}
    >
      {art}
    </div>
    <div className="px-6 pt-6 pb-4 space-y-2">
      <h2 className="t-title text-[var(--text-1)]">{title}</h2>
      <p className="t-body text-[var(--text-2)]">{text}</p>
    </div>
  </div>
)


// ---------------------------------------------------------------------------
const Welcome: React.FC<SlideProps> = ({ name }) => (
  <Frame
    tone="gold"
    title={`Bem-vindo, ${name}`}
    text="Esta é a app da equipa de atletismo da U.R. Charneca: provas, treinos, carrinha e avisos, num só sítio."
    art={
      <div className="absolute inset-0 block-blue flex items-center justify-center">
        <img
          src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
          alt="Emblema da União Recreativa da Charneca"
          width={168}
          height={168}
          className="w-40 h-40 object-cover"
        />
      </div>
    }
  />
)

const EXPLORE_KINDS: Array<{ kind: ActivityKind; label: string; title: string; place: string; date: string }> = [
  { kind: 'trofeu_cascais', label: 'Troféu', title: 'Etapa 1 do Troféu de Cascais', place: '09:30 · Cascais', date: '2026-11-22' },
  { kind: 'equipa', label: 'Clube', title: 'Marginal Cascais a Lisboa', place: '10:00 · Marginal', date: '2026-11-08' },
  { kind: 'training', label: 'Treinos', title: 'Treino de terça', place: '19:00 · Quinta da Marinha', date: '2026-11-10' },
  { kind: 'event', label: 'Eventos', title: 'Jantar de Natal da equipa', place: '20:00 · Sociedade', date: '2026-12-12' },
]

const Explore: React.FC<SlideProps> = () => {
  const [pick, setPick] = useState(0)
  const k = EXPLORE_KINDS[pick]
  return (
    <Frame
      title="Explora tudo num só sítio"
      text="Provas do Troféu, do clube, treinos e eventos. Escolhe uma categoria: experimenta aqui."
      art={
        <div className="relative w-full px-6 space-y-3">
          <div className="joined" role="group" aria-label="Experimenta as categorias">
            {EXPLORE_KINDS.map((x, i) => (
              <button
                key={x.kind}
                type="button"
                aria-pressed={i === pick}
                onClick={() => setPick(i)}
                className={`min-w-0 min-h-11 px-1 t-small t-strong border-2 border-[var(--text-1)] pressable ${
                  i === pick ? 'bg-[var(--run)] text-[var(--on-accent)]' : 'bg-[var(--bg-app)] text-[var(--text-1)]'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div key={k.kind} className="fade-in bg-[var(--bg-app)] border-t-[3px] border-[var(--rule-strong)] grid grid-cols-[52px_minmax(0,1fr)] gap-3.5 items-center p-3">
            <DateBlock date={k.date} />
            <div className="min-w-0 space-y-1">
              <div className="t-item text-[var(--text-1)] truncate">{k.title}</div>
              <div className="t-small text-[var(--text-2)] truncate">{k.place}</div>
              <KindBadge kind={k.kind} />
            </div>
          </div>
        </div>
      }
    />
  )
}

type Transport = 'van' | 'own' | 'ride'
const TRANSPORT_TEXT: Record<Transport, string> = {
  van: 'Ficas com um lugar na carrinha. Se estiver cheia, entras em lista de espera.',
  own: 'Vais por ti: não ocupas lugar na carrinha.',
  ride: 'Pedes boleia a um colega e aparece na lista de quem precisa.',
}

const Register: React.FC<SlideProps> = () => {
  const [mode, setMode] = useState<Transport>('van')
  const taken = 5
  const seats = Array.from({ length: 9 }, (_, i) => i)
  return (
    <Frame
      title="Inscreve-te em dois toques"
      text="Toca numa prova, carrega em Inscrever e diz como vais. Experimenta o transporte:"
      art={
        <div className="relative w-full px-6 space-y-4">
          <div className="bg-[var(--bg-app)] border-t-[3px] border-[var(--rule-strong)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="t-small t-strong text-[var(--text-1)]">Carrinha do clube</span>
              <span className="num-wide text-[20px] text-[var(--text-1)]">{taken + (mode === 'van' ? 1 : 0)}/9</span>
            </div>
            <div className="grid grid-cols-9 gap-1.5" aria-hidden="true">
              {seats.map((i) => {
                const mine = i === taken && mode === 'van'
                const full = i < taken
                return (
                  <span
                    key={i}
                    className="h-8 transition-colors"
                    style={{
                      background: mine ? 'var(--run)' : full ? 'var(--border-card-strong)' : 'var(--surface-raised)',
                      outline: mine ? '2px solid var(--run)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                )
              })}
            </div>
          </div>
          <div className="joined" role="radiogroup" aria-label="Transporte">
            {([['van', 'Carrinha'], ['ride', 'Boleia'], ['own', 'Por mim']] as Array<[Transport, string]>).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                onClick={() => setMode(v)}
                className={`min-w-0 min-h-11 t-small t-strong border-2 border-[var(--text-1)] pressable ${
                  mode === v ? 'bg-[var(--run)] text-[var(--on-accent)]' : 'bg-[var(--bg-app)] text-[var(--text-1)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p key={mode} className="t-small text-[var(--text-1)] fade-in min-h-10" aria-live="polite">
            {TRANSPORT_TEXT[mode]}
          </p>
        </div>
      }
    />
  )
}

const Kids: React.FC<SlideProps> = ({ active }) => {
  const [linked, setLinked] = useState(false)
  return (
    <Frame
      tone="gold"
      title="Também para as crianças"
      text="Cria o perfil de cada criança a teu cargo e inscreve-a nas provas abertas a crianças, com carrinha incluída."
      art={
        <div className="relative w-full px-6 flex flex-col items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Avatar name="Tu" size={64} />
              <span className="t-small text-[var(--text-2)]">Tu</span>
            </div>
            <svg width="72" height="12" viewBox="0 0 72 12" aria-hidden="true">
              <line x1="2" y1="6" x2="70" y2="6" stroke="var(--text-1)" strokeWidth="3" strokeDasharray="72" strokeDashoffset={active && linked ? 0 : 72} style={{ transition: 'stroke-dashoffset .6s ease' }} />
              <line x1="2" y1="6" x2="70" y2="6" stroke="var(--border-card-strong)" strokeWidth="3" strokeDasharray="2 8" opacity={linked ? 0 : 1} />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <span>
                <Avatar name="Criança" child size={64} />
              </span>
              <span className="t-small text-[var(--text-2)]">{linked ? 'A teu cargo' : 'Criança'}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-app)] border-t-[3px] border-[var(--rule-strong)] p-3 w-full flex items-center gap-3">
            <Baby className="w-5 h-5 text-[var(--text-1)] shrink-0" aria-hidden="true" />
            <span className="t-small text-[var(--text-1)] flex-1">Prova aberta a crianças</span>
            {linked ? <Tag tone="ok">Inscrita</Tag> : <Tag tone="neutral">Por inscrever</Tag>}
          </div>
          <Button variant={linked ? 'secondary' : 'primary'} size="sm" onClick={() => setLinked((v) => !v)}>
            {linked ? 'Desfazer' : 'Experimenta: adicionar criança'}
          </Button>
        </div>
      }
    />
  )
}

const FOLLOW_STEPS = [
  { label: 'Pedes a inscrição', state: 'Pedido enviado', text: 'Pedes a inscrição e ficas a aguardar o clube.' },
  { label: 'Inscrição feita', state: 'Inscrito', text: 'O clube inscreve-te e avisa nos Comunicados.' },
  { label: 'Dorsal entregue', state: 'Dorsal entregue', text: 'O dorsal chega ao clube e é-te entregue. Está tudo pronto.' },
]

const Follow: React.FC<SlideProps> = ({ active }) => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) {
      setStep(0)
      return
    }
    const t = setInterval(() => setStep((s) => (s < 2 ? s + 1 : s)), 1700)
    return () => clearInterval(t)
  }, [active])
  return (
    <Frame
      title="Acompanha cada passo"
      text="Em Inscrições vês o estado de cada pedido, e os Comunicados avisam-te quando algo muda. Toca nos passos."
      art={
        <div className="relative w-full px-8 space-y-6">
          <ol className="relative space-y-5">
            <span className="absolute left-[15px] top-4 bottom-4 w-[3px] bg-[var(--border-card-strong)]" aria-hidden="true" />
            <span
              className="absolute left-[15px] top-4 w-[3px] bg-[var(--run)]"
              style={{ height: `calc((100% - 32px) * ${step / 2})`, transition: 'height .7s ease' }}
              aria-hidden="true"
            />
            {FOLLOW_STEPS.map((s, i) => (
              <li key={s.label}>
                <button type="button" onClick={() => setStep(i)} className="relative w-full flex items-center gap-4 text-left min-h-11 cursor-pointer">
                  <span
                    className="w-8 h-8 flex items-center justify-center shrink-0 transition-colors t-small t-strong"
                    style={{
                      background: i <= step ? 'var(--run)' : 'var(--surface-card)',
                      color: i <= step ? 'var(--on-accent)' : 'var(--text-1)',
                      border: i <= step ? 'none' : '2px solid var(--border-card-strong)',
                    }}
                  >
                    {i <= step ? <Check className="w-4 h-4" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block t-body ${i === step ? 't-strong text-[var(--text-1)]' : 'text-[var(--text-2)]'}`}>{s.label}</span>
                  </span>
                  {i === step && <Tag tone={i === 0 ? 'warn' : 'ok'}>{s.state}</Tag>}
                </button>
              </li>
            ))}
          </ol>
          <p key={step} className="t-small text-[var(--text-1)] fade-in min-h-10" aria-live="polite">
            {FOLLOW_STEPS[step].text}
          </p>
        </div>
      }
    />
  )
}

const PEOPLE = ['João F.', 'Patrícia M.', 'Carlos L.']
const Manage: React.FC<SlideProps> = () => {
  const [chosen, setChosen] = useState<Set<number>>(new Set([0]))
  const [done, setDone] = useState<Set<number>>(new Set())
  const toggle = (i: number) =>
    setChosen((prev) => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  const pending = [...chosen].filter((i) => !done.has(i))
  return (
    <Frame
      tone="gold"
      title="Gere a equipa à tua maneira"
      text="Como administrador, escolhes as inscrições a confirmar (ou confirmas todas) e marcas os dorsais no clube e entregues."
      art={
        <div className="relative w-full px-6 space-y-3">
          <div className="bg-[var(--bg-app)] rule-list px-2">
            {PEOPLE.map((p, i) => (
              <label key={p} className="flex items-center gap-3 min-h-14 cursor-pointer px-1">
                <input type="checkbox" checked={chosen.has(i)} onChange={() => toggle(i)} className="w-5 h-5 accent-[var(--run)]" aria-label={`Escolher ${p}`} />
                <Avatar name={p} size={32} />
                <span className="t-small text-[var(--text-1)] flex-1 truncate">{p}</span>
                {done.has(i) ? <Tag tone="ok">Inscrito</Tag> : <Tag tone="warn">Pedido enviado</Tag>}
              </label>
            ))}
          </div>
          <Button
            block
            disabled={pending.length === 0}
            onClick={() => setDone((d) => new Set([...d, ...pending]))}
          >
            Confirmar inscrição ({pending.length})
          </Button>
        </div>
      }
    />
  )
}
