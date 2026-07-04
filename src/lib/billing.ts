// Modelo de cobrança por respostas (1 resposta = 1 questionário completo respondido)

/** Teto absoluto de respostas por mês, independente do plano. */
export const RESPONSES_HARD_CAP = 6000

/** Valor cobrado por resposta excedente ao limite do plano, em R$. */
export const OVERAGE_PRICE_BRL = 2

/** Limites mensais de respostas por plano. */
export const PLAN_RESPONSE_LIMITS: Record<string, number> = {
  trial: 50,
  mensal: 300,
  semestral: 1200,
  anual: 3000,
}

export interface UsageSummary {
  used: number
  limit: number
  excess: number
  overageBRL: number
  capReached: boolean
}

export function summarizeUsage(used: number, limit: number): UsageSummary {
  const excess = Math.max(0, used - limit)
  return {
    used,
    limit,
    excess,
    overageBRL: excess * OVERAGE_PRICE_BRL,
    capReached: used >= RESPONSES_HARD_CAP,
  }
}
