/**
 * Eventos globais da aplicação.
 * O modal "Criar Prova" vive uma única vez no AppShell (App.tsx);
 * qualquer ecrã pode pedir a sua abertura através desta função.
 */
export const OPEN_CREATE_RACE_EVENT = 'open-create-race'

export const openCreateRace = () => {
  window.dispatchEvent(new CustomEvent(OPEN_CREATE_RACE_EVENT))
}
