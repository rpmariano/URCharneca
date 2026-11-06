import { Toggle, Screen } from '@urcharneca/ui'
import { useState } from 'react'

export const OpcoesDaProva = () => {
  const [kids, setKids] = useState(true)
  const [van, setVan] = useState(false)
  return (
    <Screen style={{ width: 380 }}>
      <Toggle checked={kids} onChange={setKids} label="Aberta a crianças" hint="Permite inscrever perfis infantis nesta prova." />
      <Toggle checked={van} onChange={setVan} label="Carrinha do clube" hint="Os atletas podem reservar lugar." />
    </Screen>
  )
}
