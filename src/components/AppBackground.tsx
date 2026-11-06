import React from 'react'

/** Fundo liso, com um brilho subtil da cor de destaque no topo. */
export const AppBackground: React.FC = () => (
  <div aria-hidden="true" className="app-bg">
    <div
      className="absolute inset-x-0 top-0 h-64"
      style={{ background: 'radial-gradient(80% 100% at 15% 0%, color-mix(in srgb, var(--run) 9%, transparent), transparent)' }}
    />
  </div>
)
