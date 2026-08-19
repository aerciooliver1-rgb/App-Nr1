'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRiskScores, countManagers, MIN_RESPONDENTS_DEFAULT } from '@/lib/calculations/risk'
import { PLAN_RESPONSE_LIMITS, monthlyCapFor } from '@/lib/billing'
import { FACTORS } from '@/lib/data/questions'

const FIRST_QUESTION_ID = FACTORS[0].questions[0].id

// Conta respondentes direto no banco (evita o limite de 1000 linhas por fetch)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRespondentsDb(supabase: any, assessmentId: string): Promise<number> {
  const { count } = await supabase
    .from('assessment_answers')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('question_id', FIRST_QUESTION_ID)
  return count ?? 0
}

export type AssessmentState = { errors?: Record<string, string[]>; message?: string } | undefined

// ─── Criar Avaliação Modo A ─────────────────────────────────────────────────

const modeASchema = z.object({
  sector_id: z.string().uuid(),
  company_id: z.string().uuid(),
})

// Trava mensal por plano: cota + até 20% de extras (R$ 2,00 cada).
// Atingida a trava, novas avaliações bloqueiam até o reinício do ciclo de 30 dias.
async function checkResponseCapacity(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', userId).single()
  const accountId = profile?.account_id
  if (!accountId) return null

  const [{ data: used }, { data: sub }] = await Promise.all([
    supabase.rpc('count_monthly_responses_account', { p_account_id: accountId }),
    supabase.from('subscriptions').select('responses_monthly_limit').eq('account_id', accountId).maybeSingle(),
  ])
  const quota = sub?.responses_monthly_limit ?? PLAN_RESPONSE_LIMITS.trial
  const cap = monthlyCapFor(quota)
  if ((used ?? 0) >= cap) {
    return `Limite mensal do plano atingido (${cap.toLocaleString('pt-BR')} avaliações, já incluindo os extras). A contagem reinicia a cada 30 dias, contados da ativação do plano.`
  }
  return null
}

export async function createAssessmentModeA(
  state: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const quotaError = await checkResponseCapacity(supabase, user.id)
  if (quotaError) return { message: quotaError }

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

  const quotaError = await checkResponseCapacity(supabase, user.id)
  if (quotaError) return { message: quotaError }

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
  respondentIndex: number = 1,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (answers.length === 0) return {}

  const factorId = answers[0].factorId

  // Substitui as respostas deste fator para o respondente atual
  await supabase
    .from('assessment_answers')
    .delete()
    .eq('assessment_id', assessmentId)
    .eq('factor_id', factorId)
    .eq('respondent_index', respondentIndex)

  const rows = answers.map((a, i) => ({
    assessment_id: assessmentId,
    question_id: a.questionId,
    factor_id: a.factorId,
    score: a.score,
    respondent_index: respondentIndex,
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
): Promise<{ error?: string; pending?: { responded: number; total: number } }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Modo A é respondido pelos gestores: o cálculo só conclui quando
  // todos os gerentes responsáveis do setor tiverem respondido.
  const { data: sector } = await supabase
    .from('sectors')
    .select('manager_name')
    .eq('id', sectorId)
    .single()
  const managersTotal = countManagers(sector?.manager_name)

  const responded = await countRespondentsDb(supabase, assessmentId)

  if (responded < managersTotal) {
    revalidatePath(`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/questionario`)
    return { pending: { responded, total: managersTotal } }
  }

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

  // Garantia de anonimato (ISO 45003): mínimo de respondentes validado no servidor
  const respondents = await countRespondentsDb(supabase, assessmentId)
  if (respondents < MIN_RESPONDENTS_DEFAULT) {
    return { error: `São necessárias ao menos ${MIN_RESPONDENTS_DEFAULT} respostas para calcular (recebidas: ${respondents}).` }
  }

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

  // Trava mensal do plano da conta dona da avaliação (cota + extras de 20%)
  const { data: owner } = await supabase
    .from('assessments')
    .select('created_by')
    .eq('id', tokenRow.assessment_id)
    .single()
  if (owner?.created_by) {
    const { data: creatorProfile } = await supabase
      .from('profiles').select('account_id').eq('id', owner.created_by).single()
    const accountId = creatorProfile?.account_id
    if (accountId) {
      const [{ data: used }, { data: sub }] = await Promise.all([
        supabase.rpc('count_monthly_responses_account', { p_account_id: accountId }),
        supabase.from('subscriptions').select('responses_monthly_limit').eq('account_id', accountId).maybeSingle(),
      ])
      const quota = sub?.responses_monthly_limit ?? PLAN_RESPONSE_LIMITS.trial
      if ((used ?? 0) >= monthlyCapFor(quota)) {
        return { error: 'A coleta deste mês atingiu o limite do plano. Novas respostas serão aceitas no reinício do ciclo de 30 dias.' }
      }
    }
  }

  // Cada colaborador anônimo recebe o próximo índice de respondente
  const nextIndex = (await countRespondentsDb(supabase, tokenRow.assessment_id)) + 1

  const rows = answers.map(a => ({
    assessment_id: tokenRow.assessment_id,
    question_id: a.questionId,
    factor_id: a.factorId,
    score: a.score,
    respondent_index: nextIndex,
  }))

  const { error } = await supabase.from('assessment_answers').insert(rows)
  if (error) return { error: 'Erro ao registrar respostas. Tente novamente.' }

  return {}
}

// ─── Cálculo interno (reutilizado por Modo A e B) ───────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runRiskCalculation(assessmentId: string, supabase: any): Promise<string | null> {
  // Caminho principal: agregação dentro do Postgres (suporta 6.000+ respondentes
  // sem transferir centenas de milhares de linhas para o app). A RPC é
  // privilegiada (EXECUTE revogado de anon/authenticated) — roda via service role.
  const service = await createServiceClient()
  const { error: rpcError } = await service.rpc('calculate_risk_scores_sql', {
    p_assessment_id: assessmentId,
  })
  if (!rpcError) {
    const { count } = await service
      .from('risk_scores')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessmentId)
    if ((count ?? 0) > 0) return null
    return 'Nenhuma resposta encontrada para calcular.'
  }

  // Fallback: cálculo em JS com fetch paginado
  // Fetch paginado: coletas grandes ultrapassam o limite de 1000 linhas por página
  const answers: { question_id: string; factor_id: string; score: number }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: page } = await supabase
      .from('assessment_answers')
      .select('question_id, factor_id, score')
      .eq('assessment_id', assessmentId)
      .order('id')
      .range(from, from + PAGE - 1)
    if (!page || page.length === 0) break
    answers.push(...page)
    if (page.length < PAGE) break
  }

  if (answers.length === 0) return 'Nenhuma resposta encontrada para calcular.'

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
