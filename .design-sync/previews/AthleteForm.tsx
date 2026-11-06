import { AthleteForm, Screen, emptyAthlete, demoProfiles } from '@urcharneca/ui'

const patricia = demoProfiles.find((p) => p.id === 'ath-patricia-mariano')!

export const EditarAtleta = () => (
  <Screen style={{ width: 400 }}>
    <AthleteForm initial={patricia} allowRole submitLabel="Guardar" onSubmit={() => {}} onCancel={() => {}} />
  </Screen>
)

export const NovoAtleta = () => (
  <Screen style={{ width: 400 }}>
    <AthleteForm initial={{ ...emptyAthlete(), name: 'Inês Carvalho', nickname: 'Inês', gender: 'F', escalao: 'Seniores F' }} submitLabel="Criar atleta" onSubmit={() => {}} />
  </Screen>
)
