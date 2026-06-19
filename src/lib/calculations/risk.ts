import { FACTORS, QUESTIONS_MAP } from '@/lib/data/questions'
import type { RiskLevel } from '@/types'

export interface AnswerRow {
  question_id: string
  factor_id: string
  score: number
}

export interface RiskScoreResult {
  factor_id: string
  score: number
  level: RiskLevel
}

function normalizeScore(rawScore: number, inversao: boolean): number {
  if (inversao) return ((5 - rawScore) / 4) * 100
  return ((rawScore - 1) / 4) * 100
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= 25) return 'baixo'
  if (score <= 50) return 'moderado'
  if (score <= 75) return 'alto'
  return 'critico'
}

export function calculateRiskScores(answers: AnswerRow[]): RiskScoreResult[] {
  return FACTORS.map(factor => {
    const factorAnswers = answers.filter(a => a.factor_id === factor.id)

    const questionScores = factor.questions.map(q => {
      const qAnswers = factorAnswers.filter(a => a.question_id === q.id)
      if (qAnswers.length === 0) return null
      const avgRaw = qAnswers.reduce((sum, a) => sum + a.score, 0) / qAnswers.length
      return normalizeScore(avgRaw, q.inversao)
    }).filter((s): s is number => s !== null)

    const factorScore =
      questionScores.length > 0
        ? questionScores.reduce((sum, s) => sum + s, 0) / questionScores.length
        : 0

    const rounded = Math.round(factorScore * 100) / 100

    return {
      factor_id: factor.id,
      score: rounded,
      level: scoreToLevel(rounded),
    }
  })
}

export function countRespondents(answers: AnswerRow[]): number {
  const firstQuestion = FACTORS[0].questions[0]
  return answers.filter(a => a.question_id === firstQuestion.id).length
}

export const MIN_RESPONDENTS_DEFAULT = 5
