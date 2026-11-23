import React, { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar } from './ui'
import { compressPhoto } from './PhotoField'

/** Avatar tocável com emblema de câmara: escolhe e grava logo a foto (ex.: cartão do Perfil). */
export const PhotoAvatarButton: React.FC<{
  name: string
  value?: string
  gender?: 'M' | 'F'
  child?: boolean
  size?: number
  onChange: (photo: string) => void
  onError: (message: string) => void
}> = ({ name, value, gender, child, size = 72, onChange, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Mudar a minha foto"
        className="relative shrink-0 rounded-full pressable min-w-11 min-h-11"
      >
        <Avatar name={name} photo={value} gender={gender} child={child} size={size} />
        <span
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--run)] text-[var(--on-accent)] border-2 border-[var(--surface-card)]"
          aria-hidden="true"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Ficheiro da foto"
        data-testid="photo-input-quick"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          try {
            onChange(await compressPhoto(file))
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Não foi possível usar esta imagem.')
          } finally {
            setBusy(false)
            if (inputRef.current) inputRef.current.value = ''
          }
        }}
      />
    </>
  )
}
