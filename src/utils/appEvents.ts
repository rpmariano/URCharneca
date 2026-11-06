/**
 * Eventos globais da aplicação.
 * Os formulários de criação (prova, treino/evento, comunicado) vivem uma única vez
 * no AppShell (App.tsx); qualquer ecrã pede a sua abertura através destas funções.
 */
import type { Race, TeamEvent, TeamEventType } from '../types'

export const OPEN_EDITOR_EVENT = 'urc-open-editor'

export type EditorRequest =
  | { kind: 'race'; race?: Race }
  | { kind: 'event'; eventType?: TeamEventType; event?: TeamEvent }
  | { kind: 'notice'; relatedRaceId?: string }

export const openEditor = (req: EditorRequest) => {
  window.dispatchEvent(new CustomEvent<EditorRequest>(OPEN_EDITOR_EVENT, { detail: req }))
}

export const openCreateRace = (race?: Race) => openEditor({ kind: 'race', race })
export const openCreateEvent = (eventType: TeamEventType = 'training', event?: TeamEvent) =>
  openEditor({ kind: 'event', eventType, event })
export const openCreateNotice = (relatedRaceId?: string) => openEditor({ kind: 'notice', relatedRaceId })
