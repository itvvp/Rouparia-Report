import type { ReactNode } from 'react'
import type { User } from './auth.ts'

// Stroke icons (24px grid, 1.75 stroke). CSP is style-src 'self', so no inline styles anywhere: size/colour come from CSS classes.
const PATHS = {
  upload: 'M12 16V4m0 0L8 8m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  download: 'M12 4v12m0 0-4-4m4 4 4-4M4 20h16',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  logout: 'M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 16l4-4-4-4M20 12H9',
  chevron: 'm9 6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
}

export const Icon = ({ name }: { name: keyof typeof PATHS }) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
)

export const Logo = () => (
  <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" className="logo-bg" />
    <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11.5a2.4 2.4 0 1 0-2.4-2.4" />
      <path d="M16 11.5v2M16 13.5 7.4 19.2a1.1 1.1 0 0 0 .6 2h16a1.1 1.1 0 0 0 .6-2z" />
    </g>
  </svg>
)

const initials = (u: Pick<User, 'name' | 'email'>) => {
  const w = (u.name || u.email).split(/[\s@.]+/).filter(Boolean)
  return ((w[0]?.[0] ?? '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase()
}
// stable colour per user (one of 6 hues, picked by a hash of the e-mail)
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 6

export const Avatar = ({ user, size = 'md' }: { user: Pick<User, 'name' | 'email'>; size?: 'md' | 'lg' }) => (
  <span className={`avatar ${size} av${hue(user.email)}`} aria-hidden="true">{initials(user)}</span>
)

export const RoleBadge = ({ role }: { role: string }) => <span className={`role role-${role}`}>{role}</span>

/** Shared page header: brand on the left, page actions + the signed-in user (avatar) on the right. */
export function TopBar({ user, children }: { user: User; children?: ReactNode }) {
  return (
    <header className="top">
      <div className="brand"><Logo /><h1>Rouparia</h1></div>
      <nav>
        {children}
        <span className="me">
          <Avatar user={user} />
          <span className="who"><b>{user.name || user.email}</b><RoleBadge role={user.role} /></span>
        </span>
      </nav>
    </header>
  )
}
