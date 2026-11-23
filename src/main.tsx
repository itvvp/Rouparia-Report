import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import Login from './Login.tsx'
import Users from './Users.tsx'
import { logout, me, type User } from './auth.ts'
import './style.css'

// undefined = checking session, null = logged out
function Gate() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [page, setPage] = useState<'app' | 'users'>('app')
  useEffect(() => { me().then(setUser) }, [])
  if (user === undefined) return <p className="center">A verificar sessão…</p>
  if (!user) return <Login onLogin={u => { setPage('app'); setUser(u) }} />
  // App stays mounted (just hidden) so the loaded Excel files survive a visit to "Utilizadores"
  return (
    <>
      <div hidden={page !== 'app'}>
        <App user={user} onLogout={() => logout().then(() => setUser(null))} onUsers={user.role === 'superuser' ? () => setPage('users') : undefined} />
      </div>
      {page === 'users' && user.role === 'superuser' && <Users onBack={() => setPage('app')} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Gate />)
