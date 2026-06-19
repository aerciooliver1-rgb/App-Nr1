'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ─── Toggle intervenção (add / remove) ──────────────────────────────────────

export async function toggleIntervention(
  assessmentId: string,
  factorId: string,
  programId: string,
): Promise<{ error?: string; added: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.', added: false }

  const { data: existing } = await supabase
    .from('interventions')
    .select('id')
    .eq('assessment_id', assessmentId)
    .eq('factor_id', factorId)
    .eq('program_id', programId)
    .maybeSingle()

  if (existing) {
    await supabase.from('interventions').delete().eq('id', existing.id)
    revalidatePath('/empresas')
    return { added: false }
  }

  await supabase.from('interventions').insert({
    assessment_id: assessmentId,
    factor_id: factorId,
    program_id: programId,
    created_by: user.id,
  })
  revalidatePath('/empresas')
  return { added: true }
}

// ─── Criar programa personalizado ───────────────────────────────────────────

const programSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description: z.string().optional(),
})

export type ProgramFormState =
  | { errors?: Record<string, string[]>; message?: string; program?: Program }
  | undefined

export interface Program {
  id: string
  name: string
  description: string | null
  type: 'padrao' | 'personalizado'
}

export async function createCustomProgram(
  state: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = programSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { data, error } = await supabase
    .from('programs')
    .insert({
      name: validated.data.name,
      description: validated.data.description ?? null,
      type: 'personalizado',
      created_by: user.id,
    })
    .select('id, name, description, type')
    .single()

  if (error || !data) return { message: 'Erro ao criar programa.' }

  revalidatePath('/empresas')
  return {
    program: {
      id: data.id,
      name: data.name,
      description: data.description,
      type: 'personalizado',
    },
  }
}
