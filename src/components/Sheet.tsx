import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Contentor universal de modais / bottom-sheets.
 *
 * - Renderizado via portal em `document.body` (fora de qualquer stacking context
 *   de `<main>`), com `z-[100]`, por isso fica SEMPRE acima do Header e da BottomNav.
 * - Fecha ao clicar no fundo escurecido (backdrop) e com a tecla `Escape`.
 * - Bloqueia o scroll da página enquanto estiver aberto.
 * - Suporta modais empilhados: apenas o modal do topo responde ao `Escape`.
 */

// Pilha de modais abertos (para o Escape fechar apenas o do topo)
const sheetStack: number[] = []
let sheetIdSeq = 0
let scrollLockCount = 0

interface SheetProps {
  onClose: () => void
  children: React.ReactNode
  /** 'bottom' = bottom-sheet (mobile), 'center' = diálogo centrado */
  variant?: 'bottom' | 'center'
  /** Classes adicionais do painel */
  panelClassName?: string
  panelStyle?: React.CSSProperties
  ariaLabel?: string
}

export const Sheet: React.FC<SheetProps> = ({
  onClose,
  children,
  variant = 'bottom',
  panelClassName = '',
  panelStyle,
  ariaLabel,
}) => {
  const idRef = useRef<number>(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const id = ++sheetIdSeq
    idRef.current = id
    sheetStack.push(id)

    // Guardar elemento focado antes de abrir o modal
    if (document.activeElement instanceof HTMLElement) {
      previousActiveElement.current = document.activeElement
    }

    // Bloqueio de scroll do body
    scrollLockCount += 1
    if (scrollLockCount === 1) document.body.style.overflow = 'hidden'

    // Focar primeiro elemento interativo dentro do painel
    const timer = setTimeout(() => {
      if (panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length > 0) {
          focusable[0].focus()
        }
      }
    }, 50)

    const handleKey = (e: KeyboardEvent) => {
      if (sheetStack[sheetStack.length - 1] !== id) return

      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }

      // Focus trap para navegação por teclado (Tab / Shift+Tab)
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null)

        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKey)
      const idx = sheetStack.indexOf(id)
      if (idx >= 0) sheetStack.splice(idx, 1)
      scrollLockCount = Math.max(0, scrollLockCount - 1)
      if (scrollLockCount === 0) document.body.style.overflow = ''

      // Restaurar foco ao fechar
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [])

  const isBottom = variant === 'bottom'

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex justify-center fade-in ${
        isBottom ? 'items-end' : 'items-center p-4'
      }`}
      style={{ background: 'var(--bg-scrim)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full shadow-2xl ${
          isBottom
            ? 'max-w-[480px] max-h-[90dvh] rounded-t-[24px] flex flex-col overflow-hidden sheet-in'
            : 'max-w-md max-h-[85dvh] rounded-3xl pop-in'
        } ${panelClassName}`}
        style={{
          background: 'var(--bg-sheet)',
          color: 'var(--text-2)',
          border: '1px solid var(--border-card-strong)',
          ...panelStyle,
        }}
      >
        {isBottom && (
          <div className="flex justify-center pt-2 pb-0.5 shrink-0" aria-hidden="true">
            <span className="w-10 h-1 rounded-full bg-[var(--border-card-strong)]" />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
