'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRiskScores } from '@/lib/calculations/risk'

export type AssessmentState = { errors?: Record<string, string[]>; message?: string } | undefined

// ─── Criar Avaliação Modo A ─────────────────────────────────────────────────

const modeASchema = z.object({
  sector_id: z.string().uuid(),
  company_id: z.string().uuid(),
})

export async function createAssessmentModeA(
  state: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = modeASchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { sector_id, company_id } = validated.data

  const { data, error } = await supabase
    .from('assessments')
    .insert({ sector_id, mode: 'A', status: 'rascunho', created_by: user.id })
    .select('id')
    .single()

  if (error || !data) return { message: 'Erro ao criar avaliação.' }

  redirect(`/empresas/${company_id}/setores/${sector_id}/avaliacao/${data.id}/questionario`)
}

// ─── Criar Avaliação Modo B ─────────────────────────────────────────────────

const modeBSchema = z.object({
  sector_id: z.string().uuid(),
  company_id: z.string().uuid(),
  expires_at: z.string().min(1, { message: 'Defina o prazo de coleta.' }),
})

export async function createAssessmentModeB(
  state: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = modeBSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { sector_id, company_id, expires_at } = validated.data

  const { data: assessment, error: aErr } = await supabase
    .from('assessments')
    .insert({ sector_id, mode: 'B', status: 'em_coleta', created_by: user.id })
    .select('id')
    .single()

  if (aErr || !assessment) return { message: 'Erro ao criar avaliação.' }

  const { error: tErr } = await supabase
    .from('assessment_tokens')
    .insert({ assessment_id: assessment.id, expires_at })

  if (tErr) return { message: 'Erro ao gerar token de acesso.' }

  redirect(`/empresas/${company_id}/setores/${sector_id}/avaliacao/${assessment.id}/coleta`)
}

// ─── Salvar respostas de um fator (Modo A) ──────────────────────────────────

export interface AnswerInput {
  questionId: string
  factorId: string
  score: number
}

export async function saveFactorAnswers(
  assessmentId: string,
  answers: AnswerInput[],
  clinicalNote?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (answers.length === 0) return {}

  const factorId = answers[0].factorId

  // Substitui as respostas deste fator
  await supabase
    .from('assessment_answers')
    .delete()
    .eq('assessment_id', assessmentId)
    .eq('factor_id', factorId)

  const rows = answers.map((a, i) => ({
    assessment_id: assessmentId,
    question_id: a.questionId,
    factor_id: a.factorId,
    score: a.score,
    clinical_note: i === 0 ? (clinicalNote ?? null) : null,
  }))

  const { error } = await supabase.from('assessment_answers').insert(rows)
  if (error) return { error: 'Erro ao salvar respostas.' }

  return {}
}

// ─── Submeter avaliação Modo A + calcular risco ─────────────────────────────

export async function submitAssessment(
  assessmentId: string,
  companyId: string,
  sectorId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const err = await runRiskCalculation(assessmentId, supabase)
  if (err) return { error: err }

  revalidatePath(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/resultado`)
  redirect(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/resultado`)
}

// ─── Encerrar coleta Modo B ──────────────────────────────────────────────────

export async function closeCollection(
  assessmentId: string,
  companyId: string,
  sectorId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  await supabase
    .from('assessment_tokens')
    .update({ status: 'encerrado' })
    .eq('assessment_id', assessmentId)

  const err = await runRiskCalculation(assessmentId, supabase)
  if (err) return { error: err }

  revalidatePath(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/resultado`)
  redirect(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/resultado`)
}

// ─── Estender prazo do token ─────────────────────────────────────────────────

export async function extendDeadline(
  tokenId: string,
  assessmentId: string,
  newExpiresAt: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('assessment_tokens')
    .update({ expires_at: newExpiresAt, status: 'ativo' })
    .eq('id', tokenId)

  if (error) return { error: 'Erro ao atualizar prazo.' }

  revalidatePath(`/empresas`)
  return {}
}

// ─── Submissão anônima (Modo B — sem autenticação) ─────────────────────────

export async function submitAnonymousAnswers(
  token: string,
  answers: AnswerInput[],
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()

  // Valida token
  const { data: tokenRow } = await supabase
    .from('assessment_tokens')
    .select('id, assessment_id, status, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) return { error: 'Link inválido ou expirado.' }
  if (tokenRow.status !== 'ativo') return { error: 'Este link foi encerrado.' }
  if (new Date(tokenRow.expires_at) < new Date()) return { error: 'Este link expirou.' }

  const rows = answers.map(a => ({
    assessment_id: tokenRow.assessment_id,
    question_id: a.questionId,
    factor_id: a.factorId,
    score: a.score,
  }))

  const { error } = await supabase.from('assessment_answers').insert(rows)
  if (error) return { error: 'Erro ao registrar respostas. Tente novamente.' }

  return {}
}

// ─── Cálculo interno (reutilizado por Modo A e B) ───────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runRiskCalculation(assessmentId: string, supabase: any): Promise<string | null> {
  const { data: answers } = await supabase
    .from('assessment_answers')
    .select('question_id, factor_id, score')
    .eq('assessment_id', assessmentId)

  if (!answers || answers.length === 0) return 'Nenhuma resposta encontrada para calcular.'

  const scores = calculateRiskScores(answers)

  const upsertRows = scores.map(s => ({
    assessment_id: assessmentId,
    factor_id: s.factor_id,
    score: s.score,
    level: s.level,
  }))

  const { error: scoreErr } = await supabase
    .from('risk_scores')
    .upsert(upsertRows, { onConflict: 'assessment_id,factor_id' })

  if (scoreErr) return 'Erro ao salvar resultados.'

  await supabase
    .from('assessments')
    .update({ status: 'calculado' })
    .eq('id', assessmentId)

  return null
}
