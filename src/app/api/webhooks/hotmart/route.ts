import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { planFromOfferCode, subscriptionFieldsFor, trialFields } from '@/lib/hotmart'

// Webhook da Hotmart (Postback 2.0):
//   PURCHASE_APPROVED / PURCHASE_COMPLETE  → ativa o plano da oferta comprada
//   PURCHASE_CANCELED / PURCHASE_REFUNDED / PURCHASE_CHARGEBACK /
//   SUBSCRIPTION_CANCELLATION              → rebaixa para trial
// A compra é casada com a conta pelo E-MAIL do comprador.

interface HotmartWebhook {
  event?: string
  data?: {
    buyer?: { email?: string }
    product?: { id?: number | string; name?: string }
    purchase?: {
      status?: string
      transaction?: string
      offer?: { code?: string }
    }
    subscriber?: { email?: string }
  }
}

const ACTIVATE_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'])
const CANCEL_EVENTS = new Set([
  'PURCHASE_CANCELED',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_PROTEST',
  'SUBSCRIPTION_CANCELLATION',
])

async function audit(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  action: string,
  detail: Record<string, unknown>,
) {
  // Trilha de auditoria dos eventos de pagamento (tabela audit_logs)
  await supabase.from('audit_logs').insert({
    action: `${action}: ${JSON.stringify(detail).slice(0, 500)}`,
    table_name: 'subscriptions',
  })
}

export async function POST(request: Request) {
  const hottok = process.env.HOTMART_HOTTOK
  if (!hottok) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  // Verificação de autenticidade: a Hotmart envia o hottok no header
  const received = request.headers.get('x-hotmart-hottok')
  if (received !== hottok) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let payload: HotmartWebhook
  try {
    payload = (await request.json()) as HotmartWebhook
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const event = payload.event ?? ''
  const email =
    payload.data?.buyer?.email?.trim().toLowerCase() ??
    payload.data?.subscriber?.email?.trim().toLowerCase() ??
    null
  const offerCode = payload.data?.purchase?.offer?.code ?? null
  const transaction = payload.data?.purchase?.transaction ?? null

  const supabase = await createServiceClient()

  if (!ACTIVATE_EVENTS.has(event) && !CANCEL_EVENTS.has(event)) {
    // Evento não tratado — confirma o recebimento para a Hotmart não reenviar
    return NextResponse.json({ received: true, ignored: event })
  }

  if (!email) {
    await audit(supabase, 'hotmart_sem_email', { event, transaction })
    return NextResponse.json({ received: true, warning: 'sem e-mail do comprador' })
  }

  // Localiza o usuário pelo e-mail de login (auth.users via admin API)
  const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr) {
    await audit(supabase, 'hotmart_erro_busca_usuario', { event, email, transaction })
    return NextResponse.json({ error: 'Erro ao localizar usuário.' }, { status: 500 })
  }
  const user = usersPage.users.find(u => u.email?.toLowerCase() === email)

  if (!user) {
    // Compra sem conta correspondente: registra para ativação manual
    await audit(supabase, 'hotmart_email_nao_encontrado', { event, email, offerCode, transaction })
    return NextResponse.json({ received: true, warning: 'usuário não encontrado — registrado para ativação manual' })
  }

  // O plano é da conta (tenant) inteira, compartilhado pela equipe — não só de quem comprou
  const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', user.id).single()
  const accountId = profile?.account_id
  if (!accountId) {
    await audit(supabase, 'hotmart_sem_conta', { event, email, offerCode, transaction })
    return NextResponse.json({ received: true, warning: 'usuário sem conta associada — registrado para ativação manual' })
  }

  if (ACTIVATE_EVENTS.has(event)) {
    const plan = planFromOfferCode(offerCode)
    if (!plan) {
      await audit(supabase, 'hotmart_oferta_desconhecida', { event, email, offerCode, transaction })
      return NextResponse.json({ received: true, warning: `oferta não mapeada: ${offerCode}` })
    }

    const fields = subscriptionFieldsFor(plan)
    const { error } = await supabase
      .from('subscriptions')
      .upsert({ user_id: user.id, account_id: accountId, ...fields }, { onConflict: 'account_id' })

    if (error) {
      await audit(supabase, 'hotmart_erro_ativacao', { event, email, plan, transaction, error: error.message })
      return NextResponse.json({ error: 'Erro ao ativar plano.' }, { status: 500 })
    }

    await audit(supabase, 'hotmart_plano_ativado', { event, email, plan, transaction })
    return NextResponse.json({ received: true, activated: plan })
  }

  // Cancelamento / reembolso / chargeback → volta ao trial
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: user.id, account_id: accountId, ...trialFields() }, { onConflict: 'account_id' })

  if (error) {
    await audit(supabase, 'hotmart_erro_cancelamento', { event, email, transaction, error: error.message })
    return NextResponse.json({ error: 'Erro ao processar cancelamento.' }, { status: 500 })
  }

  await audit(supabase, 'hotmart_plano_cancelado', { event, email, transaction })
  return NextResponse.json({ received: true, canceled: true })
}
