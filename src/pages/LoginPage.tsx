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

/**
 * Ecrã de Login da Armada Azul (U.R. Charneca):
 * - O utilizador nunca escolhe manualmente o perfil de atleta.
 * - O atleta tem obrigatoriamente de ter um email associado na sua ficha e login autorizado pelo Admin.
 * - Ao entrar (com Google ou com Email + Palavra-passe), o sistema identifica automaticamente o atleta pelo email.
 */
export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithGoogle } = useApp()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleFallbackHint, setGoogleFallbackHint] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSubmitting(true)
    try {
      const res = await loginWithEmail(
        email,
        password,
        googleFallbackHint && email.trim().toLowerCase().endsWith('@gmail.com') ? 'google' : 'email'
      )
      if (!res.success) {
        setErrorMsg(res.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleClick = async () => {
    setErrorMsg('')
    setSubmitting(true)
    try {
      const res = await loginWithGoogle()
      if (!res.success) {
        setErrorMsg(res.message)
        if (res.fallbackToEmailFlow) {
          setGoogleFallbackHint(true)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10 bg-[var(--bg-app)] text-[var(--text-1)]">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] t-small t-strong text-[var(--run)]">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> U.R. Charneca · Armada Azul
          </div>
          <h1 className="t-display text-[var(--text-1)]">Entrar na equipa</h1>
          <p className="t-small text-[var(--text-3)]">
            O acesso é feito exclusivamente pelo email associado à tua ficha de atleta, após autorização expressa do
            administrador.
          </p>
        </div>

        <div className="card-raised p-6 space-y-5">
          <Button type="button" variant="secondary" block disabled={submitting} onClick={() => void handleGoogleClick()}>
            <GoogleIcon /> Continuar com Google
          </Button>

          <div className="flex items-center gap-3 t-small text-[var(--text-3)]">
            <span className="h-px flex-1 bg-[var(--border-card)]" />
            <span>ou entra com o email da ficha</span>
            <span className="h-px flex-1 bg-[var(--border-card)]" />
          </div>

          <form className="space-y-3" onSubmit={(e) => void handleEmailSubmit(e)}>
            <Field
              label="Email associado na ficha *"
              hint={
                googleFallbackHint
                  ? 'Introduz o email Google (ou outro email) que o administrador associou na tua ficha.'
                  : 'No teu primeiro login com um email já autorizado pelo admin, a palavra-passe fica guardada.'
              }
            >
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
            <Field label="Palavra-passe *">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                className={inputClass}
                placeholder="Mínimo 6 carateres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {errorMsg && (
              <div className="rounded-xl bg-[var(--surface-raised)] border border-[var(--danger)] px-3.5 py-2.5 t-small text-[var(--danger)]">
                {errorMsg}
              </div>
            )}

            <Button type="submit" block disabled={submitting}>
              <LogIn className="w-4 h-4" aria-hidden="true" /> Entrar
            </Button>
          </form>
        </div>

        <p className="t-small text-center text-[var(--text-3)]">
          Não consegues entrar? Pede ao administrador para confirmar se o teu email está associado e autorizado na tua
          ficha de atleta.
        </p>
      </div>
    </div>
  )
}
