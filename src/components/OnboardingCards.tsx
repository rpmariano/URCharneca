import React from 'react'
import { Lightbulb, X } from 'lucide-react'
import { useOnboardingItem } from '../utils/onboarding'

/** Dica de uma linha, mostrada até ser dispensada (e guardada neste dispositivo). */
export const ContextualHint: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { visible, dismiss } = useOnboardingItem(id)
  if (!visible) return null
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--tint-blue-bg)] text-[var(--tint-blue-fg)] px-4 py-3" role="note">
      <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="t-small flex-1">{children}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar dica"
        className="w-11 h-11 -my-2 -mr-3 flex items-center justify-center shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
