import React, { useState } from 'react'
import { LogIn, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Field, inputClass } from '../components/ui'

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
    />
  </svg>
)

type Mode = 'signin' | 'signup' | 'reset'

/**
 * Entrada na equipa. O acesso é só por convite: o administrador autoriza o email na ficha do atleta.
 * Quem tem conta Google entra com Google; os restantes usam email e palavra-passe
 * (a primeira vez em "Criar conta", com confirmação por email).
 */
export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, signUpWithEmail, requestPasswordReset, updatePassword, recoveryMode } = useApp()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const run = async (action: () => Promise<{ success: boolean; message: string }>) => {
    setMessage(null)
    setSubmitting(true)
    try {
      const res = await action()
      if (res.message) setMessage({ text: res.message, ok: res.success })
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (recoveryMode) return void run(() => updatePassword(password))
    if (mode === 'signin') return void run(() => loginWithEmail(email, password))
    if (mode === 'signup') return void run(() => signUpWithEmail(email, password))
    return void run(() => requestPasswordReset(email))
  }

  const title = recoveryMode ? 'Nova palavra-passe' : mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Recuperar acesso' : 'Entrar na equipa'
  const intro = recoveryMode
    ? 'Define a palavra-passe com que vais entrar daqui para a frente.'
    : mode === 'signup'
      ? 'Usa o email que o administrador associou à tua ficha. Vais receber um email para o confirmar.'
      : mode === 'reset'
        ? 'Indica o email da tua ficha e enviamos uma ligação para definires nova palavra-passe.'
        : 'O acesso é por convite do administrador. Entra com o email da tua ficha de atleta.'
  const submitLabel = recoveryMode ? 'Guardar palavra-passe' : mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Enviar ligação' : 'Entrar'

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10 bg-[var(--bg-app)] text-[var(--text-1)]">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] t-small t-strong text-[var(--run)]">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> U.R. Charneca · Armada Azul
          </div>
          <h1 className="t-title text-[var(--text-1)]">{title}</h1>
          <p className="t-small text-[var(--text-3)]">{intro}</p>
        </div>

        <div className="card-raised p-6 space-y-5">
          {!recoveryMode && mode !== 'reset' && (
            <>
              <Button type="button" variant="secondary" block disabled={submitting} onClick={() => void run(loginWithGoogle)}>
                <GoogleIcon /> Continuar com Google
              </Button>
              <div className="flex items-center gap-3 t-small text-[var(--text-3)]">
                <span className="h-px flex-1 bg-[var(--border-card)]" />
                <span>ou com email e palavra-passe</span>
                <span className="h-px flex-1 bg-[var(--border-card)]" />
              </div>
            </>
          )}

          <form className="space-y-3" onSubmit={onSubmit}>
            {!recoveryMode && (
              <Field label="Email da ficha">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            )}
            {mode !== 'reset' && (
              <Field label="Palavra-passe" hint={mode === 'signin' && !recoveryMode ? undefined : 'Mínimo 8 carateres.'}>
                <input
                  type="password"
                  required
                  minLength={mode === 'signin' && !recoveryMode ? 1 : 8}
                  autoComplete={mode === 'signin' && !recoveryMode ? 'current-password' : 'new-password'}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            )}

            {message && (
              <div
                role="status"
                className={`rounded-xl px-3.5 py-2.5 t-small ${
                  message.ok
                    ? 'bg-[var(--tint-emerald-bg)] text-[var(--tint-emerald-fg)]'
                    : 'bg-[var(--surface-raised)] border border-[var(--danger)] text-[var(--danger)]'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" block disabled={submitting}>
              <LogIn className="w-4 h-4" aria-hidden="true" /> {submitLabel}
            </Button>
          </form>

          {!recoveryMode && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {mode !== 'signin' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode('signin')}>
                  Já tenho conta
                </Button>
              )}
              {mode !== 'signup' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode('signup')}>
                  Primeiro acesso
                </Button>
              )}
              {mode !== 'reset' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode('reset')}>
                  Esqueci a palavra-passe
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="t-small text-center text-[var(--text-3)]">
          Não consegues entrar? Pede ao administrador para confirmar que o teu email está associado e autorizado na tua ficha.
        </p>
      </div>
    </div>
  )
}
