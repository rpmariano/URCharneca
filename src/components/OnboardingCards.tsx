import React from 'react'
import { Lightbulb, X } from 'lucide-react'
import { useOnboardingItem } from '../utils/onboarding'
import { Button, IconButton } from './ui'

/** Cartão de boas-vindas da página Explorar: três passos, adaptados a atletas e a administradores. Dispensável. */
export const WelcomeCard: React.FC<{ admin: boolean; name: string }> = ({ admin, name }) => {
  const { visible, dismiss } = useOnboardingItem(admin ? 'welcome-admin' : 'welcome-athlete')
  if (!visible) return null

  const steps = admin
    ? [
        ['Cria', 'Com o botão + no topo crias provas, treinos, eventos e comunicados.'],
        ['Confirma', 'Abre uma prova e, em "Quem vai", escolhe as inscrições a confirmar ou confirma todas de uma vez.'],
        ['Acompanha', 'Marca os dorsais "no clube" e "entregue" na mesma lista. Em Gerir vês o que falta.'],
      ]
    : [
        ['Escolhe', 'Toca numa prova ou num treino para veres a data, o local e quem vai.'],
        ['Inscreve-te', 'Carrega em "Inscrever", escolhe a distância e como vais (carrinha, boleia ou por ti). Podes inscrever também as tuas crianças.'],
        ['Acompanha', 'O clube confirma o pedido e avisa nos Comunicados. Vês tudo em Inscrições.'],
      ]

  return (
    <section className="card-raised p-5 space-y-4 relative" aria-label="Como começar">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="t-heading text-[var(--text-1)]">Bem-vindo, {name}</h2>
          <p className="t-small text-[var(--text-3)]">{admin ? 'Vista de administrador' : 'Três passos para a tua primeira prova'}</p>
        </div>
        <IconButton label="Fechar guia" onClick={dismiss} className="-mt-2 -mr-2">
          <X className="w-4 h-4" aria-hidden="true" />
        </IconButton>
      </div>
      <ol className="space-y-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-[var(--run)] text-[var(--on-accent)] t-small t-strong flex items-center justify-center shrink-0" aria-hidden="true">
              {i + 1}
            </span>
            <span className="t-body text-[var(--text-2)]">
              <span className="t-strong text-[var(--text-1)]">{title}.</span> {text}
            </span>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" onClick={dismiss}>
        Percebi
      </Button>
    </section>
  )
}

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
