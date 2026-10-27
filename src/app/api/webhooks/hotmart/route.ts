import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { planFromOfferCode, subscriptionFieldsFor, trialFields, PLAN_LABELS, type PlanId } from '@/lib/hotmart'
import { generatePassword } from '@/lib/password'

// Webhook da Hotmart (Postback 2.0):
//   PURCHASE_APPROVED / PURCHASE_COMPLETE  → ativa o plano da oferta comprada
//     (se o e-mail do comprador não tiver conta ainda, a conta é criada na
//     hora — onboarding automático, ver sendWelcomeEmail)
//   PURCHASE_CANCELED / PURCHASE_REFUNDED / PURCHASE_CHARGEBACK /
//   SUBSCRIPTION_CANCELLATION              → rebaixa para trial
// A compra é casada com a conta pelo E-MAIL do comprador.

interface HotmartWebhook {
  event?: string
  data?: {
    buyer?: { email?: string; name?: string }
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
  // Trilha de auditoria dos eventos de pagamento (tabela audit_logs) —
  // nunca inclui a senha gerada, só metadados da compra.
  await supabase.from('audit_logs').insert({
    action: `${action}: ${JSON.stringify(detail).slice(0, 500)}`,
    table_name: 'subscriptions',
  })
}

/** E-mail de boas-vindas com a senha de acesso gerada — melhor esforço,
 *  nunca bloqueia a ativação do plano se o envio falhar (mesmo padrão de
 *  actions/approvals.ts). Retorna `false` quando não há como avisar o
 *  cliente — quem chama registra isso no audit_logs, pra não ficar silencioso. */
async function sendWelcomeEmail(email: string, fullName: string, password: string, plan: PlanId): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_sua_chave_aqui') return false

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com',
      to: email,
      subject: 'Seu acesso ao DRPS está liberado!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e40af">Bem-vindo(a) ao DRPS</h2>
          <p>Olá, <strong>${fullName}</strong>,</p>
          <p>Seu pagamento do plano <strong>${PLAN_LABELS[plan]}</strong> foi aprovado e sua conta
             já está ativa. Seus dados de acesso:</p>
          <table style="margin:20px 0;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">E-mail</td><td><strong>${email}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Senha</td><td><strong>${password}</strong></td></tr>
          </table>
          <p style="margin:24px 0">
            <a href="${loginUrl}"
               style="background:#1e40af;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold">
              Entrar na plataforma
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">
            Por segurança, recomendamos trocar essa senha depois do primeiro acesso, em
            Configurações → Perfil, ou pelo link "Esqueci minha senha" na tela de login.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="color:#9ca3af;font-size:12px">
            Sistema de Gestão de Riscos Psicossociais — NR-1 / Portaria MTE nº 1.419/2024
          </p>
        </div>
      `,
    })
    return true
  } catch {
    return false
  }
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
  const fullName = payload.data?.buyer?.name?.trim() || null
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
    if (!ACTIVATE_EVENTS.has(event)) {
      // Cancelamento/reembolso de um e-mail sem conta — nada a fazer
      await audit(supabase, 'hotmart_email_nao_encontrado', { event, email, offerCode, transaction })
      return NextResponse.json({ received: true, warning: 'usuário não encontrado' })
    }

    // Onboarding automático: compra aprovada de quem ainda não tem conta.
    const plan = planFromOfferCode(offerCode)
    if (!plan) {
      await audit(supabase, 'hotmart_oferta_desconhecida', { event, email, offerCode, transaction })
      return NextResponse.json({ received: true, warning: `oferta não mapeada: ${offerCode}` })
    }

    const password = generatePassword()
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Sem account_id nos metadados → handle_new_user() cria uma conta nova,
      // com este usuário como admin dela (mesmo fluxo do primeiro cadastro manual).
      user_metadata: { full_name: fullName || email.split('@')[0] },
    })
    if (createErr || !created?.user) {
      await audit(supabase, 'hotmart_erro_criacao_conta', { event, email, offerCode, transaction, error: createErr?.message })
      return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 })
    }

    const { data: newProfile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', created.user.id)
      .single()
    const newAccountId = newProfile?.account_id
    if (!newAccountId) {
      await audit(supabase, 'hotmart_conta_sem_account_id', { event, email, offerCode, transaction })
      return NextResponse.json({ error: 'Conta criada sem account_id.' }, { status: 500 })
    }

    const fields = subscriptionFieldsFor(plan)
    const { error: subErr } = await supabase
      .from('subscriptions')
      .upsert({ user_id: created.user.id, account_id: newAccountId, ...fields }, { onConflict: 'account_id' })
    if (subErr) {
      await audit(supabase, 'hotmart_erro_ativacao', { event, email, plan, transaction, error: subErr.message })
      return NextResponse.json({ error: 'Erro ao ativar plano.' }, { status: 500 })
    }

    const emailSent = await sendWelcomeEmail(email, fullName || email, password, plan)
    if (!emailSent) {
      // Cliente pagou e a conta existe, mas não recebeu e-mail nenhum com a senha —
      // precisa de ação manual (reenviar credenciais). Ação própria pra não passar
      // despercebido dentro do log geral: ver sinalizador em "Changelog" no menu.
      await audit(supabase, 'hotmart_erro_envio_email_boas_vindas', { event, email, plan, transaction })
    }
    await audit(supabase, 'hotmart_conta_criada_e_ativada', { event, email, plan, transaction })
    return NextResponse.json({ received: true, created: true, activated: plan })
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
