'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient, getAccountContext } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type UserFormState = { error?: string; success?: boolean; errors?: Record<string, string[]> } | undefined

export interface ManagedUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string | null
  last_sign_in_at: string | null
}

// ─── Listar usuários da própria conta ─────────────────────────────────────────

export async function listUsers(): Promise<ManagedUser[]> {
  const ctx = await getAccountContext()
  if (!ctx || !ctx.accountId) return []
  if (ctx.role !== 'admin' && !ctx.isSuperadmin) return []

  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('account_id', ctx.accountId)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  if (profileMap.size === 0) return []

  const serviceClient = await createServiceClient()
  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 200 })

  return authUsers
    .filter(u => profileMap.has(u.id))
    .map(u => {
      const p = profileMap.get(u.id)!
      return {
        id: u.id,
        full_name: p.full_name,
        email: u.email ?? '',
        role: p.role as UserRole,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }
    })
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
}

// ─── Criar usuário da equipe (com senha definida por quem convida) ────────────

const createUserSchema = z.object({
  email: z.string().email('E-mail inválido'),
  full_name: z.string().min(2, 'Informe o nome completo'),
  role: z.enum(['admin', 'colaborador', 'visualizador']),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export async function createTeamUser(prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const ctx = await getAccountContext()
  if (!ctx || !ctx.accountId) return { error: 'Não autorizado.' }
  if (ctx.role !== 'admin' && !ctx.isSuperadmin) return { error: 'Apenas administradores podem adicionar usuários.' }

  const validated = createUserSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { email, full_name, role, password } = validated.data

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, account_id: ctx.accountId },
  })

  if (error) return { error: `Erro ao criar usuário: ${error.message}` }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ─── Alterar role ─────────────────────────────────────────────────────────────

export async function updateUserRole(
  targetUserId: string,
  role: UserRole,
): Promise<{ error?: string }> {
  if (role === 'superadmin') return { error: 'Nível de acesso inválido.' }

  const ctx = await getAccountContext()
  if (!ctx || !ctx.accountId) return { error: 'Não autorizado.' }
  if (ctx.role !== 'admin' && !ctx.isSuperadmin) return { error: 'Apenas administradores podem alterar roles.' }
  if (targetUserId === ctx.userId) return { error: 'Não é possível alterar o próprio role.' }

  const supabase = await createClient()
  const { data: target } = await supabase.from('profiles').select('account_id').eq('id', targetUserId).single()
  if (!target || target.account_id !== ctx.accountId) return { error: 'Usuário não pertence à sua conta.' }

  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: 'Erro ao atualizar role.' }

  revalidatePath('/configuracoes')
  return {}
}

// ─── Revogar acesso ───────────────────────────────────────────────────────────

export async function revokeUser(targetUserId: string): Promise<{ error?: string }> {
  const ctx = await getAccountContext()
  if (!ctx || !ctx.accountId) return { error: 'Não autorizado.' }
  if (ctx.role !== 'admin' && !ctx.isSuperadmin) return { error: 'Apenas administradores podem revogar acessos.' }
  if (targetUserId === ctx.userId) return { error: 'Não é possível revogar o próprio acesso.' }

  const supabase = await createClient()
  const { data: target } = await supabase.from('profiles').select('account_id').eq('id', targetUserId).single()
  if (!target || target.account_id !== ctx.accountId) return { error: 'Usuário não pertence à sua conta.' }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.deleteUser(targetUserId)
  if (error) return { error: `Erro ao revogar acesso: ${error.message}` }

  revalidatePath('/configuracoes')
  return {}
}
