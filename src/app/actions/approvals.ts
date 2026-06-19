'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type SendApprovalState = {
  error?: string
  success?: boolean
  approvalUrl?: string
} | undefined

export type ApprovalFormState = {
  errors?: Record<string, string[]>
  error?: string
  success?: boolean
} | undefined

export interface ApprovalRecord {
  id: string
  plan_id: string
  status: string
  approved_by: string
  approved_at: string | null
  notes: string | null
  created_at: string | null
}

// ─── Enviar para aprovação (authenticated) ───────────────────────────────────

const sendSchema = z.object({
  plan_id: z.string().uuid('ID de plano inválido'),
  recipient_email: z.string().email('E-mail inválido'),
  recipient_name: z.string().min(2, 'Informe o nome do destinatário'),
})

export async function sendForApproval(
  prevState: SendApprovalState,
  formData: FormData,
): Promise<SendApprovalState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const validated = sendSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    const flat = validated.error.flatten().fieldErrors
    const firstError = Object.values(flat)[0]?.[0]
    return { error: firstError ?? 'Dados inválidos.' }
  }

  const { plan_id, recipient_email, recipient_name } = validated.data

  const { data: plan } = await supabase
    .from('action_plans')
    .select('id, assessments(sectors(name, companies(name)))')
    .eq('id', plan_id)
    .maybeSingle()

  if (!plan) return { error: 'Plano não encontrado.' }

  const sector = (plan.assessments as { sectors: { name: string; companies: { name: string } | null } | null } | null)?.sectors
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? '—'
  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/aprovacao/${plan_id}`

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && apiKey !== 're_sua_chave_aqui') {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com',
        to: recipient_email,
        subject: `Aprovação de Plano NR-1 — ${companyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">Plano de Ação NR-1 aguarda sua aprovação</h2>
            <p>Olá, <strong>${recipient_name}</strong>,</p>
            <p>O diagnóstico de riscos psicossociais da <strong>${companyName}</strong>
               (setor: <strong>${sectorName}</strong>) foi concluído e o plano de ação está
               pronto para sua avaliação e aprovação.</p>
            <p style="margin:24px 0">
              <a href="${approvalUrl}"
                 style="background:#1e40af;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold">
                Revisar e Aprovar Plano
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">Ou copie o link: ${approvalUrl}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px">
              Sistema de Gestão de Riscos Psicossociais — NR-1 / Portaria MTE nº 1.419/2024
            </p>
          </div>
        `,
      })
    } catch {
      // E-mail falhou mas não bloqueia — retornamos a URL mesmo assim
    }
  }

  revalidatePath('/empresas')
  return { success: true, approvalUrl }
}

// ─── Registrar aprovação (público, usa service client) ────────────────────────

const approvalSchema = z.object({
  status: z.enum(['aprovado', 'com_ressalvas', 'em_revisao']),
  approved_by: z.string().min(2, 'Informe seu nome completo'),
  approved_at: z.string().min(1, 'Informe a data'),
  notes: z.string().optional(),
})

export async function recordApproval(
  planId: string,
  prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  const supabase = await createServiceClient()

  const { data: plan } = await supabase
    .from('action_plans')
    .select('id')
    .eq('id', planId)
    .maybeSingle()

  if (!plan) return { error: 'Plano não encontrado.' }

  const validated = approvalSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { status, approved_by, approved_at, notes } = validated.data

  if (status === 'com_ressalvas' && !notes?.trim()) {
    return { errors: { notes: ['Observações obrigatórias quando há ressalvas.'] } }
  }

  const { error } = await supabase.from('approvals').insert({
    plan_id: planId,
    status,
    approved_by,
    approved_at: new Date(approved_at + 'T00:00:00').toISOString(),
    notes: notes?.trim() || null,
  })

  if (error) return { error: 'Erro ao registrar aprovação. Tente novamente.' }

  return { success: true }
}

// ─── Buscar histórico de aprovações ──────────────────────────────────────────

export async function getApprovals(planId: string): Promise<ApprovalRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('approvals')
    .select('id, plan_id, status, approved_by, approved_at, notes, created_at')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ApprovalRecord[]
}
