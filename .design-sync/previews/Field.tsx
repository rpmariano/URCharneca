import { Field, Screen, inputClass } from '@urcharneca/ui'

export const CamposDeFormulario = () => (
  <Screen style={{ width: 380 }}>
    <div style={{ display: 'grid', gap: 14 }}>
      <Field label="Nome da prova *">
        <input className={inputClass} defaultValue="Corrida do Tejo" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data *">
          <input type="date" className={inputClass} defaultValue="2026-11-29" />
        </Field>
        <Field label="Transporte">
          <select className={inputClass} defaultValue="van">
            <option value="van">Carrinha (Ida/Volta)</option>
            <option value="own">Meios próprios</option>
          </select>
        </Field>
      </div>
      <Field label="Distâncias" hint="Separadas por vírgulas">
        <input className={inputClass} defaultValue="10 km, 5 km" />
      </Field>
    </div>
  </Screen>
)
