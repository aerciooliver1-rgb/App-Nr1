// Modelo de cobrança por avaliações (1 avaliação = 1 questionário completo respondido)
//
// Cada plano tem uma COTA MENSAL. Ultrapassando a cota, cada avaliação extra
// custa R$ 2,00 — até o limite de 20% da cota. Atingida a trava (cota + extras),
// novas avaliações são bloqueadas até a virada do mês, quando a contagem zera.
//
//   Plano      | Total contratado      | Cota/mês | Extras máx./mês | Trava
//   Mensal     | 300/mês               | 300      | 60              | 360
//   Semestral  | 3.000 no semestre     | 500      | 100             | 600
//   Anual      | 12.000 no ano         | 1.000    | 200             | 1.200
//   Trial      | demonstração          | 50       | 0 (não fatura)  | 50

/** Valor cobrado por avaliação excedente à cota mensal, em R$. */
export const OVERAGE_PRICE_BRL = 2

/** Percentual máximo de avaliações extras sobre a cota mensal. */
export const OVERAGE_PCT = 0.2

/** Cota mensal de avaliações por plano. */
export const PLAN_RESPONSE_LIMITS: Record<string, number> = {
  trial: 50,
  mensal: 300,
  semestral: 500,
  anual: 1000,
}

/**
 * Backstop técnico global (proteção contra abuso/bugs): igual à maior trava
 * possível (plano Anual). O limite comercial real é sempre a trava do plano.
 */
export const RESPONSES_HARD_CAP = 1200

/** Extras mensais permitidos para uma cota (20%; trial não tem extras). */
export function overageLimitFor(quota: number): number {
  if (quota <= PLAN_RESPONSE_LIMITS.trial) return 0
  return Math.round(quota * OVERAGE_PCT)
}

/** Trava mensal: cota + extras permitidos. */
export function monthlyCapFor(quota: number): number {
  return quota + overageLimitFor(quota)
}

export interface UsageSummary {
  used: number
  /** Cota mensal do plano */
  limit: number
  /** Extras já consumidos no mês (além da cota) */
  excess: number
  /** Máximo de extras permitidos no mês (20% da cota) */
  excessLimit: number
  /** Valor estimado dos extras em R$ */
  overageBRL: number
  /** Trava mensal (cota + extras) */
  monthlyCap: number
  /** true quando a trava foi atingida — novas avaliações bloqueadas até a virada do mês */
  blocked: boolean
}

export function summarizeUsage(used: number, limit: number): UsageSummary {
  const excessLimit = overageLimitFor(limit)
  const excess = Math.min(Math.max(0, used - limit), excessLimit)
  const monthlyCap = limit + excessLimit
  return {
    used,
    limit,
    excess,
    excessLimit,
    overageBRL: excess * OVERAGE_PRICE_BRL,
    monthlyCap,
    blocked: used >= monthlyCap,
  }
}
