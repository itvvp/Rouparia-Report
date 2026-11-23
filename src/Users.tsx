import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createUser, listUsers, type NewUser, type User } from './auth.ts'
import { Avatar, Icon, RoleBadge, TopBar } from './ui.tsx'

// same rule as the API (check_password_strength); the API stays the authority
const weak = (p: string) => p.length < 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/\d/.test(p)
const empty: NewUser = { name: '', email: '', password: '', role: 'user' }

export default function Users({ user, onBack }: { user: User; onBack: () => void }) {
  const [list, setList] = useState<User[] | null>(null)
  const [listErr, setListErr] = useState('')
  const [q, setQ] = useState('')
  const [f, setF] = useState<NewUser>(empty)
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof NewUser) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const refresh = () => listUsers().then(l => { setList(l); setListErr('') }, x => setListErr(x.message))
  useEffect(() => { refresh() }, [])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (list ?? []).filter(u => !n || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(n))
  }, [list, q])

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (weak(f.password)) return setMsg({ ok: false, text: 'A palavra-passe deve ter 8+ caracteres, com maiúscula, minúscula e número.' })
    setBusy(true)
    try {
      const u = await createUser({ ...f, name: f.name.trim(), email: f.email.trim() })
      setMsg({ ok: true, text: `Utilizador ${u.email} (${u.role}) criado.` }); setF(empty); refresh()
    } catch (x) { setMsg({ ok: false, text: x instanceof Error ? x.message : String(x) }) }
    setBusy(false)
  }

  return (
    <main>
      <TopBar user={user}><button className="ghost" onClick={onBack}><Icon name="back" />Voltar</button></TopBar>
      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Utilizadores {list && <span className="count">{list.length}</span>}</h2>
            <label className="search-wrap"><Icon name="search" />
              <input className="search" type="search" placeholder="Filtrar por nome, e-mail ou papel" aria-label="Filtrar utilizadores" value={q} onChange={e => setQ(e.target.value)} />
            </label>
          </div>
          {listErr && <p className="err pad" role="alert">{listErr}</p>}
          {!list && !listErr && <p className="muted pad">A carregar…</p>}
          {list && (
            <ul className="people">
              {shown.map(u => (
                <li key={u.id}>
                  <Avatar user={u} size="lg" />
                  <span className="who"><b>{u.name || u.email}</b><small>{u.email}</small></span>
                  <RoleBadge role={u.role} />
                </li>
              ))}
              {!shown.length && <li className="muted empty">Nenhum utilizador encontrado.</li>}
            </ul>
          )}
        </section>

        <form className="panel form" onSubmit={submit}>
          <h2>Novo utilizador</h2>
          <label>Nome<input required value={f.name} onChange={set('name')} /></label>
          <label>E-mail<input type="email" required autoComplete="off" value={f.email} onChange={set('email')} /></label>
          <label>Palavra-passe
            <input type={show ? 'text' : 'password'} required autoComplete="new-password" value={f.password} onChange={set('password')} />
            <small className="check"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> mostrar</small>
          </label>
          <label>Papel
            <select value={f.role} onChange={set('role')}>
              <option value="user">user</option><option value="admin">admin</option><option value="superuser">superuser</option>
            </select>
          </label>
          {msg && <p className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</p>}
          <button disabled={busy}><Icon name="plus" />{busy ? 'A criar…' : 'Criar utilizador'}</button>
        </form>
      </div>
    </main>
  )
}
