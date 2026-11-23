import React, { useState } from 'react'
import { LogIn, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Field, inputClass } from '../components/ui'

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
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
          <img
            src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
            alt="Emblema da União Recreativa da Charneca"
            width={88}
            height={88}
            className="mx-auto rounded-2xl object-cover border-[3px] border-[var(--gold)] shadow-[var(--shadow-float)]"
            style={{ width: 88, height: 88 }}
          />
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
