'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface LGPDExport {
  profile: {
    id: string
    full_name: string
    role: string
    created_at: string | null
  }
  auth: {
    email: string
    created_at: string | null
    last_sign_in_at: string | null
  }
  audit_logs: {
    id: string
    action: string
    table_name: string | null
    record_id: string | null
    created_at: string | null
  }[]
  assessments_created: {
    id: string
    sector_id: string
    cycle: number
    mode: string
    status: string
    created_at: string | null
  }[]
  actions_responsible: {
    id: string
    description: string
    responsible: string
    due_date: string | null
    status: string
  }[]
  exported_at: string
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.', user: null, supabase: null }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores podem realizar operações LGPD.', user: null, supabase: null }
  return { error: null, user, supabase }
}

// ─── Exportar dados do usuário ────────────────────────────────────────────────

export async function exportUserData(
  targetUserId: string,
): Promise<{ data?: LGPDExport; error?: string }> {
  const { error: authError } = await assertAdmin()
  if (authError) return { error: authError }

  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const [
    { data: profile },
    { data: { user: authUser } },
    { data: auditLogs },
    { data: assessments },
    { data: actions },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, created_at').eq('id', targetUserId).single(),
    serviceClient.auth.admin.getUserById(targetUserId),
    supabase
      .from('audit_logs')
      .select('id, action, table_name, record_id, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false }),
    supabase
      .from('assessments')
      .select('id, sector_id, cycle, mode, status, created_at')
      .eq('created_by', targetUserId)
      .order('created_at', { ascending: false }),
    supabase
      .from('actions')
      .select('id, description, responsible, due_date, status')
      .eq('created_by', targetUserId),
  ])

  if (!profile || !authUser) return { error: 'Usuário não encontrado.' }

  const exportData: LGPDExport = {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
    },
    auth: {
      email: authUser.email ?? '',
      created_at: authUser.created_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
    },
    audit_logs: (auditLogs ?? []).map(l => ({
      id: l.id,
      action: l.action,
      table_name: l.table_name,
      record_id: l.record_id,
      created_at: l.created_at,
    })),
    assessments_created: (assessments ?? []).map(a => ({
      id: a.id,
      sector_id: a.sector_id,
      cycle: a.cycle,
      mode: a.mode,
      status: a.status,
      created_at: a.created_at,
    })),
    actions_responsible: (actions ?? []).map(a => ({
      id: a.id,
      description: a.description,
      responsible: a.responsible,
      due_date: a.due_date,
      status: a.status,
    })),
    exported_at: new Date().toISOString(),
  }

  const adminSupabase = await createClient()
  const { data: { user: admin } } = await adminSupabase.auth.getUser()
  await adminSupabase.from('audit_logs').insert({
    action: 'LGPD_EXPORT',
    user_id: admin?.id ?? null,
    table_name: 'profiles',
    record_id: targetUserId,
  })

  return { data: exportData }
}

// ─── Excluir permanentemente ──────────────────────────────────────────────────

export async function permanentDeleteUser(
  targetUserId: string,
  confirmation: string,
): Promise<{ error?: string }> {
  if (confirmation !== 'EXCLUIR') {
    return { error: 'Confirmação inválida. Digite exatamente EXCLUIR para confirmar.' }
  }

  const { error: authError } = await assertAdmin()
  if (authError) return { error: authError }

  const supabase = await createClient()
  const { data: { user: admin } } = await supabase.auth.getUser()
  if (admin?.id === targetUserId) return { error: 'Não é possível excluir o próprio usuário.' }

  const { data: targetProfile } = await supabase
    .from('profiles').select('full_name').eq('id', targetUserId).single()

  await supabase.from('audit_logs').insert({
    action: 'LGPD_DELETE',
    user_id: admin?.id ?? null,
    table_name: 'profiles',
    record_id: targetUserId,
  })

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.deleteUser(targetUserId)
  if (error) return { error: `Erro ao excluir usuário: ${error.message}` }

  await supabase.from('audit_logs').delete().eq('user_id', targetUserId)

  return {}
}
