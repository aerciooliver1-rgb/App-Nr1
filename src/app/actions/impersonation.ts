'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient, getAccountContext } from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE } from '@/lib/impersonation'
import type { ImpersonationState } from '@/lib/impersonation'

/** Troca a sessão da requisição atual para a de `email`, via magic link
 *  (gerado pela service role, sem disparar e-mail) — o verifyOtp roda no
 *  cliente vinculado aos cookies da resposta, então a sessão nova já fica
 *  persistida no navegador ao final da action. */
async function switchSessionTo(email: string) {
  const serviceClient = await createServiceClient()
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error('Erro ao gerar acesso.')
  }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyError) throw new Error('Erro ao trocar de sessão.')
}

// ─── Entrar como (superadmin → dono da conta do cliente) ──────────────────────

export async function startImpersonation(
  accountId: string,
  prev: ImpersonationState,
  formData: FormData,
): Promise<ImpersonationState> {
  void prev
  void formData

  const ctx = await getAccountContext()
  if (!ctx || !ctx.isSuperadmin) return { error: 'Não autorizado.' }

  const serviceClient = await createServiceClient()

  const { data: account } = await serviceClient
    .from('accounts').select('id, owner_id').eq('id', accountId).single()
  if (!account) return { error: 'Conta não encontrada.' }

  let targetUserId = account.owner_id
  if (!targetUserId) {
    const { data: fallback } = await serviceClient
      .from('profiles').select('id').eq('account_id', accountId).eq('role', 'admin').limit(1).maybeSingle()
    targetUserId = fallback?.id ?? null
  }
  if (!targetUserId) return { error: 'Esta conta não tem nenhum administrador ativo.' }

  const { data: targetAuthUser } = await serviceClient.auth.admin.getUserById(targetUserId)
  const targetEmail = targetAuthUser?.user?.email
  if (!targetEmail) return { error: 'Usuário da conta não encontrado.' }

  const { data: session, error: sessionError } = await serviceClient
    .from('impersonation_sessions')
    .insert({ superadmin_id: ctx.userId, target_account_id: accountId, target_user_id: targetUserId })
    .select('token')
    .single()
  if (sessionError || !session) return { error: 'Erro ao iniciar sessão de suporte.' }

  try {
    await switchSessionTo(targetEmail)
  } catch (e) {
    await serviceClient.from('impersonation_sessions').delete().eq('token', session.token)
    return { error: e instanceof Error ? e.message : 'Erro ao trocar de sessão.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4h
  })

  await serviceClient.from('audit_logs').insert({
    user_id: ctx.userId,
    account_id: accountId,
    action: `impersonate_start: superadmin entrou como ${targetEmail}`,
  })

  redirect('/dashboard')
}

// ─── Voltar para a própria conta ───────────────────────────────────────────────

export async function stopImpersonation(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value
  cookieStore.delete(IMPERSONATION_COOKIE)

  if (!token) redirect('/login')

  const serviceClient = await createServiceClient()
  const { data: session } = await serviceClient
    .from('impersonation_sessions')
    .select('id, superadmin_id, target_account_id')
    .eq('token', token)
    .is('ended_at', null)
    .maybeSingle()

  if (!session) redirect('/dashboard')

  await serviceClient
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', session.id)

  const { data: superadminAuthUser } = await serviceClient.auth.admin.getUserById(session.superadmin_id)
  const superadminEmail = superadminAuthUser?.user?.email
  if (!superadminEmail) redirect('/login')

  await switchSessionTo(superadminEmail)

  await serviceClient.from('audit_logs').insert({
    user_id: session.superadmin_id,
    account_id: session.target_account_id,
    action: 'impersonate_end: superadmin retornou à própria conta',
  })

  redirect('/contas')
}
