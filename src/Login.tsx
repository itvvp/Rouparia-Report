import { useState, type FormEvent } from 'react'
import { login, type User } from './auth.ts'

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { onLogin(await login(email.trim(), password)) }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); setBusy(false) }
  }

  return (
    <main className="login">
      <h1>Rouparia</h1>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" autoComplete="username" required autoFocus value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Palavra-passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button disabled={busy}>{busy ? 'A entrar…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
