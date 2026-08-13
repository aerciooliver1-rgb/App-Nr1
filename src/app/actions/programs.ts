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
  code: string | null
  level: string | null
  factor_ids: string | null
  workload: string | null
  start_deadline: string | null
  target_audience: string | null
  modality: string | null
  sessions: string | null
  objectives: string | null
  structure: string | null
  methodology: string | null
  materials: string | null
  indicators: string | null
  score_range: string | null
  deliverable_title: string | null
  deliverable_content_label: string | null
  deliverable_content_fields: string | null
}

const PROGRAM_FIELDS =
  'id, name, description, type, created_at, code, level, factor_ids, workload, start_deadline, target_audience, modality, sessions, objectives, structure, methodology, materials, indicators, score_range, deliverable_title, deliverable_content_label, deliverable_content_fields'

// ─── Listar programas padrão ──────────────────────────────────────────────────

export async function listPadraoPrograms(): Promise<ProgramRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select(PROGRAM_FIELDS)
    .eq('type', 'padrao')
    .eq('active', true)
    .order('code')
  return (data ?? []) as ProgramRow[]
}

// ─── Validação ────────────────────────────────────────────────────────────────

const programSchema = z.object({
  name: z.string().min(2, 'Informe o nome do programa'),
  description: z.string().optional(),
  code: z.string().optional(),
  level: z.enum(['critico', 'alto', 'moderado']).optional(),
  workload: z.string().optional(),
  start_deadline: z.string().optional(),
  target_audience: z.string().optional(),
  modality: z.string().optional(),
  sessions: z.string().optional(),
  objectives: z.string().optional(),
  structure: z.string().optional(),
  methodology: z.string().optional(),
  materials: z.string().optional(),
  indicators: z.string().optional(),
})

function extractFields(formData: FormData) {
  const validated = programSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  // Fatores NR-1: checkboxes múltiplos (F01–F13) ou prevenção geral
  const factors = formData.getAll('factors').map(String).filter(Boolean)
  const factor_ids = factors.includes('todos')
    ? 'Todos (prevenção)'
    : factors.length > 0
      ? factors.sort().join(' · ')
      : null

  const d = validated.data
  return {
    fields: {
      name: d.name,
      description: d.description || null,
      code: d.code || null,
      level: d.level ?? null,
      factor_ids,
      workload: d.workload || null,
      start_deadline: d.start_deadline || null,
      target_audience: d.target_audience || null,
      modality: d.modality || null,
      sessions: d.sessions || null,
      objectives: d.objectives || null,
      structure: d.structure || null,
      methodology: d.methodology || null,
      materials: d.materials || null,
      indicators: d.indicators || null,
    },
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Não autorizado.' }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Apenas administradores podem gerenciar programas padrão.' }
  return { supabase, user }
}

// ─── Criar programa ───────────────────────────────────────────────────────────

export async function createProgram(prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const { supabase, user, error: authError } = await requireAdmin()
  if (authError || !user) return { error: authError }

  const parsed = extractFields(formData)
  if ('errors' in parsed) return { errors: parsed.errors }

  const { error } = await supabase.from('programs').insert({
    ...parsed.fields,
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
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const parsed = extractFields(formData)
  if ('errors' in parsed) return { errors: parsed.errors }

  const { error } = await supabase
    .from('programs')
    .update({ ...parsed.fields, updated_at: new Date().toISOString() })
    .eq('id', programId)
    .eq('type', 'padrao')

  if (error) return { error: 'Erro ao atualizar programa.' }

  revalidatePath('/catalogo')
  return { success: true }
}

// ─── Excluir programa ─────────────────────────────────────────────────────────

export async function deleteProgram(programId: string): Promise<{ error?: string }> {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId)
    .eq('type', 'padrao')

  if (error) return { error: 'Erro ao excluir programa. Pode estar em uso por avaliações.' }

  revalidatePath('/catalogo')
  return {}
}
