import { GoTrueClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)!
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)!

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
  )
}

const auth = new GoTrueClient({
  url: `${url}/auth/v1`,
  headers: { apikey: anonKey },
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
})

const postgrest = new PostgrestClient(`${url}/rest/v1`, {
  headers: { apikey: anonKey },
  schema: 'public',
})

const attachSession = (session: { access_token: string } | null) => {
  if (session) {
    postgrest.headers.set('Authorization', `Bearer ${session.access_token}`)
  } else {
    postgrest.headers.delete('Authorization')
  }
}

void auth.getSession().then(({ data }) => attachSession(data.session))
auth.onAuthStateChange((_event, session) => attachSession(session))

export async function invokeFunction<T = unknown>(
  name: string,
  body: unknown,
): Promise<T> {
  const { data: sessionData } = await auth.getSession()
  const token = sessionData.session?.access_token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as T
  if (!res.ok) {
    const message =
      (json as { error?: string } | null)?.error ??
      `Function "${name}" failed (${res.status})`
    throw new Error(message)
  }
  return json
}

export const supabase = {
  auth,
  from: (table: string) => postgrest.from(table),
  rpc: (fn: string, args?: object) => postgrest.rpc(fn, args),
  functions: { invoke: invokeFunction },
}
