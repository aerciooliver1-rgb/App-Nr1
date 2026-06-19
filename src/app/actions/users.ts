'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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

// ─── Listar usuários ──────────────────────────────────────────────────────────

export async function listUsers(): Promise<ManagedUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return []

  const serviceClient = await createServiceClient()
  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 200 })
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role')

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

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

// ─── Convidar usuário ─────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  full_name: z.string().min(2, 'Informe o nome completo'),
  role: z.enum(['admin', 'colaborador', 'visualizador']),
})

export async function inviteUser(prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return { error: 'Apenas administradores podem convidar usuários.' }

  const validated = inviteSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { email, full_name, role } = validated.data

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return { error: `Erro ao convidar: ${error.message}` }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ─── Alterar role ─────────────────────────────────────────────────────────────

export async function updateUserRole(
  targetUserId: string,
  role: UserRole,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return { error: 'Apenas administradores podem alterar roles.' }
  if (targetUserId === user.id) return { error: 'Não é possível alterar o próprio role.' }

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return { error: 'Apenas administradores podem revogar acessos.' }
  if (targetUserId === user.id) return { error: 'Não é possível revogar o próprio acesso.' }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.deleteUser(targetUserId)
  if (error) return { error: `Erro ao revogar acesso: ${error.message}` }

  revalidatePath('/configuracoes')
  return {}
}
