import React from 'react'

export type AvatarKind = 'man' | 'woman' | 'boy' | 'girl' | 'neutral'

/** Figura por defeito conforme género e idade: azul (M), dourado (F) ou neutra (sem género). Quadrada, como o resto da app. */
export const avatarKind = (gender?: 'M' | 'F', child?: boolean): AvatarKind =>
  gender === 'M' ? (child ? 'boy' : 'man') : gender === 'F' ? (child ? 'girl' : 'woman') : 'neutral'

const TONE: Record<AvatarKind, 'm' | 'f' | 'n'> = { man: 'm', boy: 'm', woman: 'f', girl: 'f', neutral: 'n' }

/**
 * Busto estilizado (cabeça + ombros) desenhado em 64x64. As cores vêm dos tokens --avatar-*
 * (claro/escuro). Decorativo (aria-hidden): o nome da pessoa fica sempre no texto ao lado.
 */
export const DefaultAvatar: React.FC<{ kind: AvatarKind; size?: number }> = ({ kind, size = 40 }) => {
  const t = TONE[kind]
  const fg = `var(--avatar-${t}-fg)`
  const hair = `var(--avatar-${t}-hair)`
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0 block"
      style={{ background: `var(--avatar-${t}-bg)` }}
      aria-hidden="true"
      focusable="false"
      data-avatar={kind}
    >
      {kind === 'man' && (
        <>
          <path d="M6 66c0-14 11-22 26-22s26 8 26 22z" fill={fg} />
          <rect x="27" y="34" width="10" height="12" rx="4" fill={fg} />
          <ellipse cx="32" cy="25" rx="10" ry="11.5" fill={fg} />
          <path d="M21.5 24c-1-9 4-14 10.5-14s11.5 4 10.5 14c-2-5-5-7-10.5-7s-8.5 2-10.5 7z" fill={hair} />
        </>
      )}
      {kind === 'woman' && (
        <>
          <path d="M20 26c0-11 5-17 12-17s12 6 12 17c0 9 3 15 5 20H15c2-5 5-11 5-20z" fill={hair} />
          <path d="M10 66c0-13 10-20 22-20s22 7 22 20z" fill={fg} />
          <rect x="28" y="34" width="8" height="12" rx="4" fill={fg} />
          <ellipse cx="32" cy="26" rx="9" ry="10.5" fill={fg} />
          <path d="M22.5 24c1-7 5-10 10-10 4 0 7 2 8.5 6-4-1-9-3-11-6-2 5-5 8-7.5 10z" fill={hair} />
        </>
      )}
      {kind === 'boy' && (
        <>
          <path d="M12 66c0-11 8-17 20-17s20 6 20 17z" fill={fg} />
          <rect x="28" y="40" width="8" height="10" rx="4" fill={fg} />
          <circle cx="32" cy="30" r="12.5" fill={fg} />
          <path d="M19.5 29c-1.5-9 4-15 12.5-15s13.5 6 12.5 15c-1.500-4-3.500-6-7-6.500-2 1.500-6 2-10 .5-3.500.5-6.500 2.500-8 6z" fill={hair} />
        </>
      )}
      {kind === 'girl' && (
        <>
          <circle cx="15.5" cy="35" r="6.5" fill={hair} />
          <circle cx="48.5" cy="35" r="6.5" fill={hair} />
          <path d="M12 66c0-11 8-17 20-17s20 6 20 17z" fill={fg} />
          <rect x="28" y="40" width="8" height="10" rx="4" fill={fg} />
          <circle cx="32" cy="30" r="12.5" fill={fg} />
          <path d="M19.5 30c-1-10 4-16 12.5-16s13.5 6 12.5 16c-3-3-6-6-8-9-3 4-9 7-17 9z" fill={hair} />
        </>
      )}
      {kind === 'neutral' && (
        <>
          <path d="M10 66c0-13 10-20 22-20s22 7 22 20z" fill={fg} />
          <rect x="28" y="34" width="8" height="12" rx="4" fill={fg} />
          <circle cx="32" cy="26" r="10.5" fill={fg} />
        </>
      )}
    </svg>
  )
}
