import { Segmented, Screen } from '@urcharneca/ui'
import { useState } from 'react'

export const TabsDeAdmin = () => {
  const [v, setV] = useState('panel')
  return (
    <Screen style={{ width: 400 }}>
      <Segmented
        value={v}
        onChange={setV}
        options={[
          { value: 'panel', label: 'Painel' },
          { value: 'athletes', label: 'Atletas' },
          { value: 'children', label: 'Crianças' },
          { value: 'agenda', label: 'Agenda' },
        ]}
      />
    </Screen>
  )
}

export const TipoDeProva = () => {
  const [v, setV] = useState('trofeu_cascais')
  return (
    <Screen style={{ width: 400 }}>
      <Segmented
        value={v}
        onChange={setV}
        options={[
          { value: 'trofeu_cascais', label: 'Troféu' },
          { value: 'equipa', label: 'Clube' },
          { value: 'individual', label: 'Sugerida' },
        ]}
      />
    </Screen>
  )
}
