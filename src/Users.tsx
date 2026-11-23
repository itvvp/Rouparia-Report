import { useState, type FormEvent } from 'react'
import { createUser, type NewUser } from './auth.ts'

// same rule as the API (check_password_strength); the API stays the authority
const weak = (p: string) => p.length < 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/\d/.test(p)
const empty: NewUser = { name: '', email: '', password: '', role: 'user' }

export default function Users({ onBack }: { onBack: () => void }) {
  const [f, setF] = useState<NewUser>(empty)
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof NewUser) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (weak(f.password)) return setMsg({ ok: false, text: 'A palavra-passe deve ter 8+ caracteres, com maiúscula, minúscula e número.' })
    setBusy(true)
    try {
      const u = await createUser({ ...f, name: f.name.trim(), email: f.email.trim() })
      setMsg({ ok: true, text: `Utilizador ${u.email} (${u.role}) criado.` }); setF(empty)
    } catch (x) { setMsg({ ok: false, text: x instanceof Error ? x.message : String(x) }) }
    setBusy(false)
  }

  return (
    <main className="login">
      <header className="top"><h1>Novo utilizador</h1><button className="ghost" onClick={onBack}>← Voltar</button></header>
      <form onSubmit={submit}>
        <label>Nome<input required value={f.name} onChange={set('name')} /></label>
        <label>E-mail<input type="email" required autoComplete="off" value={f.email} onChange={set('email')} /></label>
        <label>Palavra-passe
          <input type={show ? 'text' : 'password'} required autoComplete="new-password" value={f.password} onChange={set('password')} />
          <small><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> mostrar</small>
        </label>
        <label>Papel
          <select value={f.role} onChange={set('role')}>
            <option value="user">user</option><option value="admin">admin</option><option value="superuser">superuser</option>
          </select>
        </label>
        {msg && <p className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</p>}
        <button disabled={busy}>{busy ? 'A criar…' : 'Criar utilizador'}</button>
      </form>
    </main>
  )
}
