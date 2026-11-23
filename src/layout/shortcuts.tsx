import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { SIDEBAR_ITEMS } from './Sidebar'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Atalhos globais: `/` foca a pesquisa, `g` + letra navega, `?` abre a ajuda. Devolve o estado da ajuda. */
export const useShortcuts = (enabled: boolean) => {
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)
  const pendingG = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const clearG = () => {
      if (pendingG.current) window.clearTimeout(pendingG.current)
      pendingG.current = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      // Com um diálogo aberto (ex.: ficha de atleta) os atalhos ficam parados
      if (document.body.style.overflow === 'hidden') return
      if (pendingG.current) {
        const hit = SIDEBAR_ITEMS.find((i) => i.key === e.key.toLowerCase())
        clearG()
        if (hit) {
          e.preventDefault()
          navigate(hit.to)
          return
        }
      }
      if (e.key === '/') {
        const el = document.querySelector<HTMLElement>('[data-search]')
        if (el) {
          e.preventDefault()
          el.focus()
        }
      } else if (e.key === '?') {
        e.preventDefault()
        setHelpOpen(true)
      } else if (e.key === 'g') {
        pendingG.current = window.setTimeout(clearG, 1500)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearG()
    }
  }, [enabled, navigate])

  return { helpOpen, setHelpOpen }
}

export const ShortcutsHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Sheet onClose={onClose} variant="center" ariaLabel="Atalhos de teclado">
    <div className="p-6 space-y-4 min-w-[320px]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="t-heading text-[var(--text-1)]">Atalhos de teclado</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="desk-icon-btn">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <dl className="desk-shortcuts t-body">
        <dt>
          <kbd className="desk-kbd">/</kbd>
        </dt>
        <dd>Focar a pesquisa da página</dd>
        {SIDEBAR_ITEMS.map((i) => (
          <React.Fragment key={i.to}>
            <dt>
              <kbd className="desk-kbd">g</kbd> <span className="text-[var(--text-3)]">depois</span> <kbd className="desk-kbd">{i.key}</kbd>
            </dt>
            <dd>Ir para {i.label}</dd>
          </React.Fragment>
        ))}
        <dt>
          <kbd className="desk-kbd">?</kbd>
        </dt>
        <dd>Mostrar esta ajuda</dd>
        <dt>
          <kbd className="desk-kbd">Esc</kbd>
        </dt>
        <dd>Fechar diálogos</dd>
      </dl>
    </div>
  </Sheet>
)
