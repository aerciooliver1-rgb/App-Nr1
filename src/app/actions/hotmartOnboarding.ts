'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, getAccountContext } from '@/lib/supabase/server'
import { generatePassword } from '@/lib/password'
import { sendWelcomeEmail } from '@/lib/welcomeEmail'
import type { PlanId } from '@/lib/hotmart'

const KNOWN_PLANS: readonly PlanId[] = ['mensal', 'semestral', 'anual']

/** Botão "Reenviar credenciais" no Changelog — usado quando o e-mail de
 *  boas-vindas pós-compra falhou (hotmart_erro_envio_email_boas_vindas).
 *  Como a senha original nunca fica salva em lugar nenhum, a única forma de
 *  corrigir é gerar uma senha NOVA pra conta (que já existe e já está ativa)
 *  e reenviar um e-mail avisando disso. */
export async function resendWelcomeCredentials(logId: string): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getAccountContext()
  if (!ctx || !ctx.isSuperadmin) return { error: 'Não autorizado.' }

  const serviceClient = await createServiceClient()

  const { data: log } = await serviceClient
    .from('audit_logs')
    .select('user_id')
    .eq('id', logId)
    .single()

  const userId = log?.user_id
  if (!userId) {
    return { error: 'Este registro não tem uma conta associada (provavelmente um log de antes dessa funcionalidade).' }
  }

  const { data: authUser } = await serviceClient.auth.admin.getUserById(userId)
  const email = authUser?.user?.email
  if (!email) return { error: 'Usuário não encontrado — pode já ter sido removido.' }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name, account_id')
    .eq('id', userId)
    .single()
  if (!profile?.account_id) return { error: 'Conta não encontrada.' }

  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('plan_type')
    .eq('account_id', profile.account_id)
    .single()

  const plan: PlanId = KNOWN_PLANS.includes(subscription?.plan_type as PlanId)
    ? (subscription!.plan_type as PlanId)
    : 'mensal'

  const password = generatePassword()
  const { error: updateErr } = await serviceClient.auth.admin.updateUserById(userId, { password })
  if (updateErr) return { error: 'Erro ao gerar nova senha.' }

  const sent = await sendWelcomeEmail(email, profile.full_name || email, password, plan, true)
  if (!sent) {
    return { error: 'A senha foi trocada, mas o e-mail não saiu de novo — confira a configuração do Resend e tente outra vez.' }
  }

  await serviceClient.from('audit_logs').insert({
    action: `hotmart_credenciais_reenviadas: ${JSON.stringify({ email, plan })}`,
    table_name: 'subscriptions',
    user_id: userId,
  })

  revalidatePath('/changelog')
  return { success: true }
}
