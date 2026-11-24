import React, { useState } from 'react'
import { LogIn } from 'lucide-react'
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
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
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

  const needsConfirm = recoveryMode || mode === 'signup'

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (needsConfirm && password !== confirm) {
      setMessage({ text: 'As palavras-passe não coincidem. Escreve-as outra vez.', ok: false })
      return
    }
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
    <div className="min-h-dvh flex flex-col bg-[var(--bg-app)] text-[var(--text-1)]">
      {/* Bloco azul: emblema, clube e o título do passo */}
      <header className="block-blue on-blue px-5 pt-8 pb-7 space-y-6" style={{ paddingTop: 'max(32px, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
            alt="Emblema da União Recreativa da Charneca"
            width={56}
            height={56}
            className="object-cover shrink-0"
            style={{ width: 56, height: 56 }}
          />
          <div>
            <div className="font-display [font-stretch:75%] font-extrabold text-[24px] leading-none">U.R. Charneca</div>
            <div className="t-small text-[var(--hdr-fg-2)] mt-1">Atletismo · Armada Azul</div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="t-display !text-[38px] text-[var(--hdr-fg)]">{title}</h1>
          <p className="text-[15px] leading-[1.45] text-[var(--hdr-fg)]">{intro}</p>
        </div>
      </header>

      <div className="flex-1 px-5 pt-6 pb-10 space-y-6">
        <div className="space-y-5">
          {!recoveryMode && mode !== 'reset' && (
            <>
              <Button type="button" variant="secondary" block disabled={submitting} onClick={() => void run(loginWithGoogle)}>
                <GoogleIcon /> Continuar com Google
              </Button>
              <p className="rule-top pt-4 t-small t-strong text-[var(--text-1)]">Ou com email e palavra-passe</p>
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
                  type={show ? 'text' : 'password'}
                  required
                  minLength={mode === 'signin' && !recoveryMode ? 1 : 8}
                  autoComplete={mode === 'signin' && !recoveryMode ? 'current-password' : 'new-password'}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            )}

            {mode !== 'reset' && needsConfirm && (
              <Field label="Confirmar palavra-passe">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={confirm.length > 0 && confirm !== password}
                />
                {confirm.length > 0 && confirm !== password && (
                  <p className="t-small text-[var(--danger)] mt-1" role="status">
                    As palavras-passe não coincidem.
                  </p>
                )}
              </Field>
            )}
            {mode !== 'reset' && (
              <label className="flex items-center gap-2 t-small text-[var(--text-2)] min-h-11 cursor-pointer">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="w-4 h-4 accent-[var(--run)]" />
                Mostrar palavras-passe
              </label>
            )}

            {message && (
              <div
                role="status"
                className={` px-3.5 py-2.5 t-small ${
                  message.ok
                    ? 'bg-[var(--tint-blue-bg)] text-[var(--tint-blue-fg)] t-strong'
                    : 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)] t-strong'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" size="lg" block disabled={submitting}>
              <LogIn className="w-4 h-4" aria-hidden="true" /> {submitLabel}
            </Button>
          </form>

          {!recoveryMode && (
            <div className="rule-top pt-2 flex flex-wrap gap-x-2 gap-y-1 -ml-4">
              {mode !== 'signin' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('signin'); setConfirm(''); setMessage(null) }}>
                  Já tenho conta
                </Button>
              )}
              {mode !== 'signup' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('signup'); setConfirm(''); setMessage(null) }}>
                  Primeiro acesso
                </Button>
              )}
              {mode !== 'reset' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('reset'); setConfirm(''); setMessage(null) }}>
                  Esqueci a palavra-passe
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="t-small text-[var(--text-2)]">
          Não consegues entrar? Pede ao administrador para confirmar que o teu email está associado e autorizado na tua ficha.
        </p>
      </div>
    </div>
  )
}
