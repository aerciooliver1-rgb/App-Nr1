import type { RiskLevel } from '@/types'

// Combina os resultados dos dois modos de avaliação de um mesmo setor/ciclo:
// Modo A (gestores) e Modo B (colaboradores) têm peso igual por fator.
// Quando só um modo existe, o resultado é o daquele modo.

export interface ModeAssessment {
  id: string
  mode: string
  created_at: string | null
  risk_scores: { factor_id: string; score: number; level: string }[]
}

export interface CombinedScores {
  factorScores: { factor_id: string; score: number; level: RiskLevel }[]
  overallScore: number
  overallLevel: RiskLevel
  modes: string[]
  /** Avaliação usada para exportações (Modo B quando existe — base de cálculo). */
  exportAssessmentId: string | null
  byMode: Record<string, { assessmentId: string; overallScore: number }>
}

export function scoreToLevel(score: number): RiskLevel {
  return score <= 25 ? 'baixo' : score <= 50 ? 'moderado' : score <= 75 ? 'alto' : 'critico'
}

/** Última avaliação calculada de cada modo. */
export function latestPerMode(assessments: ModeAssessment[]): ModeAssessment[] {
  const byMode = new Map<string, ModeAssessment>()
  for (const a of assessments) {
    if (a.risk_scores.length === 0) continue
    const current = byMode.get(a.mode)
    if (!current || new Date(a.created_at ?? 0) > new Date(current.created_at ?? 0)) {
      byMode.set(a.mode, a)
    }
  }
  return [...byMode.values()]
}

export function combineModes(assessments: ModeAssessment[]): CombinedScores | null {
  const latest = latestPerMode(assessments)
  if (latest.length === 0) return null

  const factorIds = [...new Set(latest.flatMap(a => a.risk_scores.map(s => s.factor_id)))].sort()

  const factorScores = factorIds.map(fid => {
    const values = latest
      .map(a => a.risk_scores.find(s => s.factor_id === fid)?.score)
      .filter((v): v is number => v !== undefined)
    const score = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
    return { factor_id: fid, score, level: scoreToLevel(score) }
  })

  const overallScore = Math.round(
    factorScores.reduce((s, f) => s + f.score, 0) / factorScores.length,
  )

  const modes = latest.map(a => a.mode).sort()
  const modeB = latest.find(a => a.mode === 'B')

  const byMode: CombinedScores['byMode'] = {}
  for (const a of latest) {
    const mean = Math.round(a.risk_scores.reduce((s, r) => s + r.score, 0) / a.risk_scores.length)
    byMode[a.mode] = { assessmentId: a.id, overallScore: mean }
  }

  return {
    factorScores,
    overallScore,
    overallLevel: scoreToLevel(overallScore),
    modes,
    exportAssessmentId: modeB?.id ?? latest[0]?.id ?? null,
    byMode,
  }
}
