import type { createServiceClient } from '@/lib/supabase/server'

const FALHA_ENVIO_EMAIL = 'hotmart_erro_envio_email_boas_vindas'
const CREDENCIAIS_REENVIADAS = 'hotmart_credenciais_reenviadas'

/** Há alguma falha de envio do e-mail de boas-vindas ainda sem resolver?
 *
 *  Não existe um botão de "marcar como resolvido" — clicar em "Reenviar
 *  credenciais" (no Changelog) já É a ação de resolução. Então uma falha só
 *  conta como pendente se não houver, DEPOIS dela, um reenvio bem-sucedido
 *  pra mesma conta. Falha de uma conta que não existe mais (user_id nulo,
 *  porque a conta foi apagada depois) não conta — não há mais nada a fazer. */
export async function hasUnresolvedWelcomeEmailErrors(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<boolean> {
  const [{ data: erros }, { data: reenvios }] = await Promise.all([
    serviceClient.from('audit_logs').select('user_id, created_at').ilike('action', `${FALHA_ENVIO_EMAIL}%`),
    serviceClient.from('audit_logs').select('user_id, created_at').ilike('action', `${CREDENCIAIS_REENVIADAS}%`),
  ])

  const ultimoReenvioPorUsuario = new Map<string, string>()
  for (const r of reenvios ?? []) {
    if (!r.user_id || !r.created_at) continue
    const atual = ultimoReenvioPorUsuario.get(r.user_id)
    if (!atual || r.created_at > atual) ultimoReenvioPorUsuario.set(r.user_id, r.created_at)
  }

  return (erros ?? []).some(e => {
    if (!e.user_id || !e.created_at) return false
    const reenviadoEm = ultimoReenvioPorUsuario.get(e.user_id)
    return !reenviadoEm || reenviadoEm < e.created_at
  })
}
