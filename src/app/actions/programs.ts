'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProgramFormState = { error?: string; success?: boolean; errors?: Record<string, string[]> } | undefined

export interface ProgramRow {
  id: string
  name: string
  description: string | null
  type: 'padrao' | 'personalizado'
  created_at: string | null
}

// ─── Listar programas padrão ──────────────────────────────────────────────────

export async function listPadraoPrograms(): Promise<ProgramRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select('id, name, description, type, created_at')
    .eq('type', 'padrao')
    .order('name')
  return (data ?? []) as ProgramRow[]
}

// ─── Criar programa ───────────────────────────────────────────────────────────

const programSchema = z.object({
  name: z.string().min(2, 'Informe o nome do programa'),
  description: z.string().optional(),
})

export async function createProgram(prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem criar programas padrão.' }

  const validated = programSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { name, description } = validated.data

  const { error } = await supabase.from('programs').insert({
    name,
    description: description || null,
    type: 'padrao',
    created_by: user.id,
  })

  if (error) return { error: 'Erro ao criar programa.' }

  revalidatePath('/catalogo')
  return { success: true }
}

// ─── Atualizar programa ───────────────────────────────────────────────────────

export async function updateProgram(
  programId: string,
  prev: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem editar programas padrão.' }

  const validated = programSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { name, description } = validated.data

  const { error } = await supabase
    .from('programs')
    .update({ name, description: description || null, updated_at: new Date().toISOString() })
    .eq('id', programId)
    .eq('type', 'padrao')

  if (error) return { error: 'Erro ao atualizar programa.' }

  revalidatePath('/catalogo')
  return { success: true }
}

// ─── Excluir programa ─────────────────────────────────────────────────────────

export async function deleteProgram(programId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem excluir programas padrão.' }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId)
    .eq('type', 'padrao')

  if (error) return { error: 'Erro ao excluir programa. Pode estar em uso por avaliações.' }

  revalidatePath('/catalogo')
  return {}
}
