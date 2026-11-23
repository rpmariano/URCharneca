import React from 'react'
import { useApp } from '../context/AppContext'
import { Avatar } from './ui'
import { DefaultAvatar } from './DefaultAvatar'

/**
 * Avatar de uma pessoa identificada por id e/ou nome (inscrições, "quem vai", comunicados).
 * Procura a foto e o género em perfis/menores já carregados no contexto (sem pedidos novos);
 * sem correspondência mostra a figura neutra.
 */
export const PersonAvatar: React.FC<{ id?: string; name: string; child?: boolean; size?: number }> = ({
  id,
  name,
  child,
  size,
}) => {
  const { profiles, youthAthletes } = useApp()
  const youth = (id && youthAthletes.find((y) => y.id === id)) || (!id ? youthAthletes.find((y) => y.name === name) : undefined)
  const adult = !youth ? (id && profiles.find((p) => p.id === id)) || (!id ? profiles.find((p) => p.name === name) : undefined) : undefined
  const person = youth || adult
  if (!person) return <DefaultAvatar kind="neutral" size={size} />
  return <Avatar name={name} child={child ?? Boolean(youth)} size={size} photo={person.photo_url} gender={person.gender} />
}
