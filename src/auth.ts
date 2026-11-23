// Client for the company AuthApi (../AuthApi). Session lives in httpOnly cookies, so every call needs credentials.
export type User = { id: string; name: string; email: string; role: string }

const BASE = import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8025'

async function call(path: string, method: 'GET' | 'POST', body?: unknown) {
  return fetch(BASE + path, {
    method, credentials: 'include',
    ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

export async function login(email: string, password: string): Promise<User> {
  let r: Response
  try { r = await call('/auth/login', 'POST', { email, password }) }
  catch { throw new Error('Não foi possível contactar o servidor de autenticação.') }
  if (r.status === 401) throw new Error('E-mail ou palavra-passe incorretos.')
  if (r.status === 429) throw new Error('Demasiadas tentativas. Tenta novamente dentro de alguns minutos.')
  if (!r.ok) throw new Error(`Erro do servidor (${r.status}).`)
  return (await r.json()).user
}

/** Current session user, or null. On 401 tries one refresh (refresh-token cookie) before giving up. */
export async function me(): Promise<User | null> {
  try {
    let r = await call('/auth/getUserAuth', 'GET')
    if (r.status === 401 && (await call('/auth/refresh', 'POST')).ok) r = await call('/auth/getUserAuth', 'GET')
    return r.ok ? await r.json() : null
  } catch { return null }
}

export type NewUser = { name: string; email: string; password: string; role: 'user' | 'admin' | 'superuser' }

export async function createUser(input: NewUser): Promise<User> {
  let r: Response
  try { r = await call('/auth/createUser', 'POST', input) }
  catch { throw new Error('Não foi possível contactar o servidor.') }
  if (r.status === 201) return r.json()
  const why: Record<number, string> = {
    401: 'A sessão expirou. Volta a entrar.', 403: 'Sem permissão para criar este tipo de utilizador.',
    409: 'Já existe um utilizador com esse e-mail.', 422: 'Dados inválidos: verifica o e-mail e a palavra-passe.',
  }
  throw new Error(why[r.status] ?? `Erro do servidor (${r.status}).`)
}

export const logout =() => call('/auth/logout', 'POST').catch(() => {})
