import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Share } from 'lucide-react'

/** Emblema do clube (pequeno, com anel dourado). Decorativo: o título da barra diz onde estamos. */
export const HeaderEmblem: React.FC = () => (
  <img
    src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
    alt=""
    width={32}
    height={32}
    className="w-8 h-8 rounded-lg object-cover shrink-0 bg-[var(--hdr-bg)] ring-2 ring-[var(--hdr-ring)]"
  />
)

/** Botão redondo para usar sobre a barra azul (alvo de 44 px, foco visível). */
export const HeaderButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({
  label,
  className = '',
  type = 'button',
  children,
  ...rest
}) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    {...rest}
    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 pressable bg-[var(--surface-card)] text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hdr-fg)] ${className}`}
  >
    {children}
  </button>
)

const BAR_STYLE: React.CSSProperties = {
  background: 'var(--hdr-bg)',
  color: 'var(--hdr-fg)',
  paddingTop: 'env(safe-area-inset-top, 0px)',
}
/** `text-wrap: balance/pretty` global dos h1/p anula o nowrap do `truncate`: força-o aqui. */
const NOWRAP: React.CSSProperties = { textWrap: 'nowrap' }
const SHADOW = 'shadow-[0_2px_8px_rgba(0,0,0,0.18)]'

/**
 * Barra de topo fixa (sticky) de cada ecrã: emblema (ou elemento `leading`), título e ação opcional.
 * `children` fica também fixo, por baixo da barra (pesquisa, separadores).
 * `titleAs="p"` evita um segundo h1 quando o ecrã já tem o seu próprio título na página.
 */
export const AppHeader: React.FC<{
  title: string
  action?: React.ReactNode
  leading?: React.ReactNode
  titleAs?: 'h1' | 'p'
  className?: string
  children?: React.ReactNode
}> = ({ title, action, leading, titleAs = 'h1', className = '', children }) => {
  const Title = titleAs
  const ref = useRef<HTMLElement>(null)
  // Publica a altura do cabeçalho em --app-header-h (colunas laterais fixas usam-na para ficar por baixo dele)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const ro = new ResizeObserver(() => root.style.setProperty('--app-header-h', `${Math.round(el.offsetHeight)}px`))
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--app-header-h')
    }
  }, [])
  return (
    <header
      ref={ref}
      className={`app-header sticky top-0 z-30 ${children ? 'app-header-tall' : ''} ${SHADOW} ${className}`}
      style={BAR_STYLE}
    >
      <div className="flex items-center gap-3 px-5 min-h-14">
        {leading ?? <HeaderEmblem />}
        <Title className="t-heading flex-1 min-w-0 truncate text-[var(--hdr-fg)]" style={NOWRAP}>{title}</Title>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
      {children}
    </header>
  )
}

/**
 * Barra fixa dos detalhes de prova/evento. Em `overlay` fica transparente sobre a capa (voltar e partilhar
 * flutuantes) e ganha o fundo azul com o título ao descer para lá da capa. Sem `overlay` é sempre azul.
 */
export const DetailBar: React.FC<{
  title: string
  onBack: () => void
  onShare: () => void
  overlay?: boolean
}> = ({ title, onBack, onShare, overlay = true }) => {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!overlay) return
    const onScroll = () => {
      // A capa tem 4:3 no telemóvel e altura limitada em ecrãs maiores: mede-se a capa real
      const el = document.querySelector<HTMLElement>('.detail-cover')
      const cover = el ? el.offsetHeight : Math.min(window.innerWidth, 480) * 0.75
      setScrolled(window.scrollY > cover - 72)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overlay])

  const solid = !overlay || scrolled
  const btn = solid ? '' : 'shadow-[var(--shadow-float)]'
  return (
    <header className={`app-header sticky top-0 z-30 ${overlay ? 'h-0' : ''}`}>
      <div
        className={`flex items-center gap-3 px-4 min-h-14 transition-colors duration-150 ${
          overlay ? 'absolute inset-x-0 top-0' : ''
        } ${solid ? SHADOW : ''}`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: solid ? 'var(--hdr-bg)' : 'transparent',
          color: 'var(--hdr-fg)',
        }}
      >
        <HeaderButton label="Voltar" onClick={onBack} className={btn}>
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </HeaderButton>
        <p
          className={`t-heading flex-1 min-w-0 truncate text-[var(--hdr-fg)] transition-opacity duration-150 ${
            solid ? 'opacity-100' : 'opacity-0'
          }`}
          style={NOWRAP}
          aria-hidden="true"
        >
          {title}
        </p>
        <HeaderButton label="Partilhar" onClick={onShare} className={btn}>
          <Share className="w-5 h-5" aria-hidden="true" />
        </HeaderButton>
      </div>
    </header>
  )
}
