'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionStatus } from '@/types/database'

// ─── Sincronizar ações atrasadas ──────────────────────────────────────────────

export async function syncOverdueActions(planId: string): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('actions')
    .update({ status: 'atrasada', updated_at: new Date().toISOString() })
    .eq('plan_id', planId)
    .lt('due_date', today)
    .in('status', ['pendente', 'em_andamento'])
}

// ─── Atualizar status de uma ação (Kanban drag-and-drop) ─────────────────────

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('actions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', actionId)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/empresas')
  return {}
}

// ─── Resumo de progresso do plano ────────────────────────────────────────────

export async function getPlanProgress(planId: string) {
  const supabase = await createClient()

  const { data: actions } = await supabase
    .from('actions')
    .select('status')
    .eq('plan_id', planId)

  const total = actions?.length ?? 0
  const concluidas = actions?.filter(a => a.status === 'concluida').length ?? 0
  const emAndamento = actions?.filter(a => a.status === 'em_andamento').length ?? 0
  const atrasadas = actions?.filter(a => a.status === 'atrasada').length ?? 0

  return { total, concluidas, emAndamento, atrasadas, pct: total > 0 ? Math.round((concluidas / total) * 100) : 0 }
}
