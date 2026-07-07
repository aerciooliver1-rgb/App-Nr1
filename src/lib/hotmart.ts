// Integração Hotmart — pagamento dos planos e ativação automática de assinatura.
//
// Variáveis de ambiente (todas em .env.local e na Vercel):
//   HOTMART_HOTTOK              token de verificação do webhook (Ferramentas → Webhook)
//   HOTMART_CLIENT_ID           credencial da API (Ferramentas → Credenciais de API)
//   HOTMART_CLIENT_SECRET       idem
//   HOTMART_BASIC               token Basic da API (idem)
//   HOTMART_OFFER_MENSAL        código da oferta (off=...) do plano Mensal
//   HOTMART_OFFER_SEMESTRAL     código da oferta do plano Semestral
//   HOTMART_OFFER_ANUAL         código da oferta do plano Anual
//   NEXT_PUBLIC_HOTMART_CHECKOUT_MENSAL     URL de checkout do plano Mensal
//   NEXT_PUBLIC_HOTMART_CHECKOUT_SEMESTRAL  URL de checkout do plano Semestral
//   NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL      URL de checkout do plano Anual

import { PLAN_RESPONSE_LIMITS } from '@/lib/billing'

export type PlanId = 'mensal' | 'semestral' | 'anual'

export const PLAN_DURATION_MONTHS: Record<PlanId, number> = {
  mensal: 1,
  semestral: 6,
  anual: 12,
}

/** Resolve o plano a partir do código da oferta Hotmart (off=...). */
export function planFromOfferCode(offerCode: string | undefined | null): PlanId | null {
  if (!offerCode) return null
  const code = offerCode.trim().toLowerCase()
  const mapping: Record<string, PlanId> = {}
  if (process.env.HOTMART_OFFER_MENSAL) mapping[process.env.HOTMART_OFFER_MENSAL.toLowerCase()] = 'mensal'
  if (process.env.HOTMART_OFFER_SEMESTRAL) mapping[process.env.HOTMART_OFFER_SEMESTRAL.toLowerCase()] = 'semestral'
  if (process.env.HOTMART_OFFER_ANUAL) mapping[process.env.HOTMART_OFFER_ANUAL.toLowerCase()] = 'anual'
  return mapping[code] ?? null
}

/** Campos de assinatura para ativar um plano a partir de hoje. */
export function subscriptionFieldsFor(plan: PlanId) {
  const start = new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + PLAN_DURATION_MONTHS[plan])
  return {
    plan_type: plan,
    status: 'active',
    responses_monthly_limit: PLAN_RESPONSE_LIMITS[plan],
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  }
}

/** Campos para rebaixar ao trial (cancelamento/reembolso/chargeback). */
export function trialFields() {
  const start = new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return {
    plan_type: 'trial',
    status: 'trial',
    responses_monthly_limit: PLAN_RESPONSE_LIMITS.trial,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  }
}

/**
 * Token de acesso da API Hotmart (client credentials).
 * Uso opcional — consultas ativas de vendas/assinaturas para conciliação.
 */
export async function getHotmartAccessToken(): Promise<string | null> {
  const clientId = process.env.HOTMART_CLIENT_ID
  const clientSecret = process.env.HOTMART_CLIENT_SECRET
  const basic = process.env.HOTMART_BASIC
  if (!clientId || !clientSecret || !basic) return null

  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basic}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { access_token?: string }
  return json.access_token ?? null
}

/** URLs de checkout por plano (client-safe). */
export const CHECKOUT_URLS: Record<PlanId, string | undefined> = {
  mensal: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_MENSAL,
  semestral: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_SEMESTRAL,
  anual: process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANUAL,
}
