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

// ─── Listar catálogo (padrão + personalizados da própria conta) ──────────────

export async function listCatalogPrograms(): Promise<ProgramRow[]> {
  const supabase = await createClient()
  // RLS já restringe a: todo o catálogo padrão + apenas os personalizados da própria conta.
  const { data } = await supabase
    .from('programs')
    .select(PROGRAM_FIELDS)
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

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Não autorizado.' } as const
  const { data: profile } = await supabase
    .from('profiles').select('role, account_id').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null, accountId: profile?.account_id ?? null }
}

/** Superadmin gerencia o catálogo padrão; admin de conta gerencia apenas os programas
 *  personalizados que criou para a própria conta. */
async function canManageProgram(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: string | null,
  accountId: string | null,
  programId: string,
) {
  if (role === 'superadmin') return true
  if (role !== 'admin') return false
  const { data: program } = await supabase
    .from('programs').select('type, account_id').eq('id', programId).single()
  return program?.type === 'personalizado' && program.account_id === accountId
}

// ─── Criar programa ───────────────────────────────────────────────────────────

export async function createProgram(prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const { supabase, user, role, accountId, error: authError } = await getAuthContext()
  if (authError || !user) return { error: authError }
  if (role !== 'superadmin' && role !== 'admin') {
    return { error: 'Você não tem permissão para criar programas.' }
  }

  const parsed = extractFields(formData)
  if ('errors' in parsed) return { errors: parsed.errors }

  const isSuperadmin = role === 'superadmin'
  const { error } = await supabase.from('programs').insert({
    ...parsed.fields,
    type: isSuperadmin ? 'padrao' : 'personalizado',
    account_id: isSuperadmin ? null : accountId,
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
  const { supabase, role, accountId, error: authError } = await getAuthContext()
  if (authError) return { error: authError }
  if (!(await canManageProgram(supabase, role, accountId, programId))) {
    return { error: 'Você não tem permissão para editar este programa.' }
  }

  const parsed = extractFields(formData)
  if ('errors' in parsed) return { errors: parsed.errors }

  const { error } = await supabase
    .from('programs')
    .update({ ...parsed.fields, updated_at: new Date().toISOString() })
    .eq('id', programId)

  if (error) return { error: 'Erro ao atualizar programa.' }

  revalidatePath('/catalogo')
  return { success: true }
}

// ─── Excluir programa ─────────────────────────────────────────────────────────

export async function deleteProgram(programId: string): Promise<{ error?: string }> {
  const { supabase, role, accountId, error: authError } = await getAuthContext()
  if (authError) return { error: authError }
  if (!(await canManageProgram(supabase, role, accountId, programId))) {
    return { error: 'Você não tem permissão para excluir este programa.' }
  }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId)

  if (error) return { error: 'Erro ao excluir programa. Pode estar em uso por avaliações.' }

  revalidatePath('/catalogo')
  return {}
}
