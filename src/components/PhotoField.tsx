import React, { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Avatar, Button } from './ui'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 256
const QUALITY = 0.8

/** Recorte quadrado centrado, lado maior 256 px, JPEG ~0.8 (data URL, ~15-30 KB). */
export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolhe um ficheiro de imagem (JPG, PNG ou WebP).')
  if (file.size > MAX_FILE_BYTES) throw new Error('A imagem é demasiado grande (máximo 10 MB).')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível ler esta imagem. Tenta outra foto.')
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const out = Math.min(MAX_SIDE, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem neste dispositivo.')
    ctx.fillStyle = '#ffffff' // PNG com transparência -> fundo branco no JPEG
    ctx.fillRect(0, 0, out, out)
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    bitmap.close()
  }
}

/**
 * Pré-visualização grande + 'Escolher foto' (no telemóvel abre também a câmara) e 'Remover foto'.
 * `onChange('')` significa foto removida.
 */
export const PhotoField: React.FC<{
  name: string
  value?: string
  gender?: 'M' | 'F'
  child?: boolean
  onChange: (photo: string) => void
  size?: number
}> = ({ name, value, gender, child, onChange, size = 96 }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (file?: File) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      onChange(await compressPhoto(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível usar esta imagem.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={`Escolher foto de ${name || 'atleta'}`}
        className="relative shrink-0 rounded-full pressable min-w-11 min-h-11"
      >
        <Avatar name={name || '?'} photo={value} gender={gender} child={child} size={size} />
        <span
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--run)] text-[var(--on-accent)] border-2 border-[var(--surface-card)]"
          aria-hidden="true"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera size={16} aria-hidden="true" />
            {busy ? 'A processar…' : 'Escolher foto'}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => onChange('')}>
              <Trash2 size={16} aria-hidden="true" />
              Remover foto
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Ficheiro da foto"
          data-testid="photo-input"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <p className="t-small text-[var(--text-3)] mt-1">Opcional. Sem foto, usa-se uma figura por defeito.</p>
        {error && (
          <p role="alert" className="t-small text-[var(--tint-rose-fg)] mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
