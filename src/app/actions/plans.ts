'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { ActionType, RiskLevel } from '@/types/database'

const DAYS_BY_LEVEL: Record<RiskLevel, number> = {
  critico: 30,
  alto: 60,
  moderado: 90,
  baixo: 120,
}

// ─── Inicializar plano (chama ao avançar das intervenções) ───────────────────

export async function initializePlan(
  assessmentId: string,
  companyId: string,
  sectorId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  const userId = user.id

  // Busca intervenções com programa associado
  const { data: interventions } = await supabase
    .from('interventions')
    .select('factor_id, program_id, programs(name)')
    .eq('assessment_id', assessmentId)

  // Busca scores de risco
  const { data: scores } = await supabase
    .from('risk_scores')
    .select('factor_id, level')
    .eq('assessment_id', assessmentId)

  const scoreMap = new Map(scores?.map(s => [s.factor_id, s.level as RiskLevel]) ?? [])

  function buildRow(inv: { factor_id: string; programs: unknown }, planId: string) {
    const level: RiskLevel = scoreMap.get(inv.factor_id) ?? 'moderado'
    const today = new Date()
    const due = new Date(today)
    due.setDate(today.getDate() + DAYS_BY_LEVEL[level])
    const programName = (inv.programs as { name: string } | null)?.name ?? 'Programa'

    return {
      plan_id: planId,
      description: `Implementar: ${programName}`,
      responsible: '',
      due_date: due.toISOString().split('T')[0],
      type: (['critico', 'alto'] as RiskLevel[]).includes(level)
        ? ('corretiva' as ActionType)
        : ('preventiva' as ActionType),
      factor_id: inv.factor_id,
      risk_level: level,
      created_by: userId,
    }
  }

  // Se já existe um plano, sincroniza ações que faltam (intervenções
  // selecionadas depois da primeira visita não geravam ação nenhuma antes)
  const { data: existing } = await supabase
    .from('action_plans')
    .select('id')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (existing) {
    if (interventions && interventions.length > 0) {
      const { data: existingActions } = await supabase
        .from('actions')
        .select('description')
        .eq('plan_id', existing.id)
      const existingDescriptions = new Set((existingActions ?? []).map(a => a.description))

      const missingRows = interventions
        .map(inv => buildRow(inv, existing.id))
        .filter(row => !existingDescriptions.has(row.description))

      if (missingRows.length > 0) {
        await supabase.from('actions').insert(missingRows)
      }
    }
    redirect(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/plano`)
  }

  // Cria o plano
  const { data: plan, error: planErr } = await supabase
    .from('action_plans')
    .insert({ assessment_id: assessmentId, status: 'rascunho', created_by: user.id })
    .select('id')
    .single()

  if (planErr || !plan) return { error: 'Erro ao criar plano de ação.' }

  // Gera ações automaticamente a partir das intervenções
  if (interventions && interventions.length > 0) {
    const rows = interventions.map(inv => buildRow(inv, plan.id))
    await supabase.from('actions').insert(rows)
  }

  redirect(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/plano`)
}

// ─── Adicionar ação manual ───────────────────────────────────────────────────

const actionSchema = z.object({
  description: z.string().min(3, 'Descreva a ação com ao menos 3 caracteres'),
  responsible: z.string().min(2, 'Informe o responsável'),
  due_date: z.string().min(1, 'Defina o prazo'),
  type: z.enum(['preventiva', 'corretiva']),
  plan_id: z.string().uuid(),
})

export type ActionFormState = { errors?: Record<string, string[]>; message?: string } | undefined

export async function addAction(
  state: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = actionSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { plan_id, ...fields } = validated.data
  const { error } = await supabase.from('actions').insert({
    ...fields,
    plan_id,
    status: 'pendente',
    created_by: user.id,
  })

  if (error) return { message: 'Erro ao adicionar ação.' }

  revalidatePath('/empresas')
  return undefined
}

// ─── Atualizar campo de uma ação (inline edit) ───────────────────────────────

export async function updateAction(
  actionId: string,
  updates: {
    description?: string
    responsible?: string
    due_date?: string
    type?: ActionType
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('actions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', actionId)

  if (error) return { error: 'Erro ao salvar alteração.' }

  revalidatePath('/empresas')
  return {}
}

// ─── Remover ação ───────────────────────────────────────────────────────────

export async function deleteAction(actionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('actions').delete().eq('id', actionId)
  if (error) return { error: 'Erro ao remover ação.' }

  revalidatePath('/empresas')
  return {}
}

// ─── Finalizar plano ─────────────────────────────────────────────────────────

export async function finalizePlan(
  planId: string,
  companyId: string,
  sectorId: string,
  assessmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Valida campos obrigatórios
  const { data: actions } = await supabase
    .from('actions')
    .select('id, responsible, due_date')
    .eq('plan_id', planId)

  const incomplete = actions?.filter(a => !a.responsible || !a.due_date)
  if (incomplete && incomplete.length > 0) {
    return { error: `${incomplete.length} ação(ões) sem responsável ou prazo. Preencha antes de finalizar.` }
  }

  const { error } = await supabase
    .from('action_plans')
    .update({ status: 'finalizado', updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) return { error: 'Erro ao finalizar plano.' }

  revalidatePath('/empresas')
  redirect(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/apresentacao`)
}
