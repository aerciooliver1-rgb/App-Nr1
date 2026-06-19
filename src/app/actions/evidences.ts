'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface EvidenceRow {
  id: string
  action_id: string
  file_url: string
  file_type: string
  file_name: string
  created_at: string | null
}

// ─── Upload de evidência ──────────────────────────────────────────────────────

export async function uploadEvidence(
  actionId: string,
  formData: FormData,
): Promise<{ error?: string; evidence?: EvidenceRow }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo deve ter no máximo 10 MB.' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) return { error: 'Tipo inválido. Use PDF, PNG ou JPG.' }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `actions/${actionId}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`

  const serviceClient = await createServiceClient()
  const { error: uploadErr } = await serviceClient.storage
    .from('evidences')
    .upload(path, file, { contentType: file.type })

  if (uploadErr) return { error: `Erro no upload: ${uploadErr.message}` }

  // URL assinada com validade longa para download interno
  const { data: signed } = await serviceClient.storage
    .from('evidences')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 ano

  const fileUrl = signed?.signedUrl ?? ''

  const { data: evidence, error: dbErr } = await supabase
    .from('evidences')
    .insert({
      action_id: actionId,
      file_url: fileUrl,
      file_type: file.type,
      file_name: file.name,
      uploaded_by: user.id,
    })
    .select('id, action_id, file_url, file_type, file_name, created_at')
    .single()

  if (dbErr) return { error: 'Upload feito, mas erro ao salvar registro.' }

  revalidatePath('/empresas')
  return { evidence: evidence as EvidenceRow }
}

// ─── Listar evidências de uma ação ───────────────────────────────────────────

export async function getEvidences(actionId: string): Promise<EvidenceRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evidences')
    .select('id, action_id, file_url, file_type, file_name, created_at')
    .eq('action_id', actionId)
    .order('created_at', { ascending: false })
  return (data ?? []) as EvidenceRow[]
}

// ─── Remover evidência ────────────────────────────────────────────────────────

export async function deleteEvidence(
  evidenceId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('evidences')
    .delete()
    .eq('id', evidenceId)
    .eq('uploaded_by', user.id)

  if (error) return { error: 'Erro ao remover evidência.' }

  revalidatePath('/empresas')
  return {}
}
