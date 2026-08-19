import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, UserRole } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies são set via middleware
          }
        },
      },
    }
  )
}

export interface AccountContext {
  userId: string
  accountId: string | null
  role: UserRole | null
  isSuperadmin: boolean
}

/** Identidade + conta (tenant) do usuário logado — usar nas actions em vez de
 *  repetir `select('role').eq('id', user.id).single()` espalhado pelo código. */
export async function getAccountContext(): Promise<AccountContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_id')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    accountId: profile?.account_id ?? null,
    role: (profile?.role as UserRole) ?? null,
    isSuperadmin: profile?.role === 'superadmin',
  }
}

/** Cliente com a service role key — sempre ignora RLS, independente de qualquer
 *  sessão de usuário presente nos cookies da requisição. Importante: usa o
 *  `createClient` "puro" do supabase-js (sem o adaptador de cookies do
 *  @supabase/ssr) — com o adaptador de cookies, a sessão do usuário logado
 *  (se houver) acaba sendo usada no Authorization header em vez da service
 *  role key, quebrando o bypass de RLS quando chamado durante uma requisição
 *  autenticada (ex.: ações de superadmin). */
export async function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
