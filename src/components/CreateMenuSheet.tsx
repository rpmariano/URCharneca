import React from 'react'
import { CalendarHeart, Dumbbell, Flag, Megaphone, Users } from 'lucide-react'
import { openCreateEvent, openCreateNotice, openCreateRace } from '../utils/appEvents'
import { Sheet } from './Sheet'
import { ListRow, SheetHeader } from './ui'

/** Folha "Criar" do administrador: prova, treino, evento, reunião ou comunicado. */
export const CreateMenuSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const options = [
    { icon: Flag, title: 'Prova', description: 'Troféu de Cascais ou prova do clube', run: () => openCreateRace() },
    { icon: Dumbbell, title: 'Treino', description: 'Com plano de treino e presenças', run: () => openCreateEvent('training') },
    { icon: CalendarHeart, title: 'Evento', description: 'Convívio, jantar ou homenagem', run: () => openCreateEvent('social') },
    { icon: Users, title: 'Reunião', description: 'Reunião de equipa', run: () => openCreateEvent('meeting') },
    { icon: Megaphone, title: 'Comunicado', description: 'Aviso para toda a equipa', run: () => openCreateNotice() },
  ]
  return (
    <Sheet onClose={onClose} ariaLabel="Criar">
      <SheetHeader title="Criar" onClose={onClose} />
      <div className="px-5 py-2 divide-soft overflow-y-auto">
        {options.map((o) => (
          <ListRow
            key={o.title}
            icon={o.icon}
            title={o.title}
            description={o.description}
            onClick={() => {
              onClose()
              o.run()
            }}
          />
        ))}
      </div>
    </Sheet>
  )
}
