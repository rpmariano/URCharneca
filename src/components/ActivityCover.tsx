import React, { useId, useState } from 'react'
import type { ActivityKind } from '../types'
import { KIND_ICON } from './ui'

/**
 * Paleta das capas geradas, nas cores do clube (azul do equipamento, azul-marinho e dourado do emblema).
 * São cores fixas (não mudam com o tema) porque funcionam como uma "fotografia".
 */
const PALETTE: Record<ActivityKind, { from: string; to: string; line: string; icon: string }> = {
  trofeu_cascais: { from: '#0b2350', to: '#0a5fc0', line: '#d0a838', icon: '#e8c866' },
  equipa: { from: '#0a5fc0', to: '#3d8fe6', line: '#ffffff', icon: '#ffffff' },
  individual: { from: '#1b2f6b', to: '#5b6fe0', line: '#c9d2ff', icon: '#ffffff' },
  training: { from: '#0a4d6e', to: '#1aa3c4', line: '#bfeef7', icon: '#ffffff' },
  event: { from: '#b98a1c', to: '#e3c05a', line: '#0b2350', icon: '#0b2350' },
}

/** Número estável a partir de um texto, para variar o padrão de cada capa de forma determinística. */
const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/**
 * Capa de uma atividade. Se existir `imageUrl` mostra a imagem; caso contrário (ou se a imagem falhar)
 * desenha uma capa por tipo de atividade: gradiente, pistas de atletismo e o ícone do tipo.
 * O conteúdo (`children`) fica por cima da capa, para etiquetas e botões.
 */
export const ActivityCover: React.FC<{
  kind: ActivityKind
  seed: string
  imageUrl?: string
  alt?: string
  className?: string
  children?: React.ReactNode
}> = ({ kind, seed, imageUrl, alt = '', className = '', children }) => {
  const uid = useId()
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const p = PALETTE[kind]
  const Icon = KIND_ICON[kind]
  const h = hash(seed)
  const variant = h % 3
  const flip = (h >> 3) % 2 === 1
  const showImage = Boolean(imageUrl) && !failed

  return (
    <div className={`relative overflow-hidden bg-[var(--surface-raised)] ${className}`}>
      {/* Capa gerada: fica sempre por baixo, para nunca haver um retângulo vazio enquanto a imagem carrega ou se falhar */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={flip ? { transform: 'scaleX(-1)' } : undefined}
      >
        <defs>
          <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={p.from} />
            <stop offset="1" stopColor={p.to} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${uid}-g)`} />
        {variant === 0 && (
          // Curva de pista de atletismo
          <g fill="none" stroke={p.line} strokeOpacity="0.28" strokeWidth="3">
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M -40 ${330 - i * 26} C 120 ${300 - i * 26}, 250 ${170 - i * 22}, 440 ${150 - i * 26}`} />
            ))}
          </g>
        )}
        {variant === 1 && (
          // Pistas diagonais
          <g stroke={p.line} strokeOpacity="0.22" strokeWidth="14">
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={120 + i * 70} y1="320" x2={300 + i * 70} y2="-20" />
            ))}
          </g>
        )}
        {variant === 2 && (
          // Arcos concêntricos
          <g fill="none" stroke={p.line} strokeOpacity="0.24" strokeWidth="3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle key={i} cx="340" cy="290" r={70 + i * 38} />
            ))}
          </g>
        )}
      </svg>
      <Icon
        className="absolute right-[7%] bottom-[9%] w-[30%] h-auto max-w-[120px]"
        style={{ color: p.icon, opacity: 0.9 }}
        strokeWidth={1.4}
        aria-hidden="true"
      />
      {showImage && (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {children}
    </div>
  )
}
