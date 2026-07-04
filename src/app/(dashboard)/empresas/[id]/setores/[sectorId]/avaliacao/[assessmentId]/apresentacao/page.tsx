import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ApresentacaoClient } from './ApresentacaoClient'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'
import type { ApprovalRecord } from '@/app/actions/approvals'

async function getData(assessmentId: string) {
  const supabase = await createClient()

  const [
    { data: assessment },
    { data: scores },
    { data: plan },
  ] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, mode, cycle, created_at, status, sectors(name, companies(name))')
      .eq('id', assessmentId)
      .single(),
    supabase
      .from('risk_scores')
      .select('factor_id, score, level')
      .eq('assessment_id', assessmentId),
    supabase
      .from('action_plans')
      .select('id, status, actions(id, description, responsible, due_date, type, risk_level)')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
  ])

  if (!assessment || !plan) return null

  const { data: approvals } = await supabase
    .from('approvals')
    .select('id, plan_id, status, approved_by, approved_at, notes, created_at')
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })

  return { assessment, scores: scores ?? [], plan, approvals: (approvals ?? []) as ApprovalRecord[] }
}

export default async function ApresentacaoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getData(assessmentId)
  if (!data) notFound()

  const { assessment, scores, plan, approvals } = data
  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'

  const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel: RiskLevel = scores.sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )[0]?.level as RiskLevel ?? 'baixo'

  const enrichedScores = scores.map(s => ({
    ...s,
    factorName: FACTORS.find(f => f.id === s.factor_id)?.name ?? s.factor_id,
  }))

  return (
    <>
      <Header title="Apresentação" />
      <ApresentacaoClient
        assessmentId={assessmentId}
        planId={plan.id}
        planStatus={plan.status}
        companyId={id}
        sectorId={sectorId}
        companyName={companyName}
        sectorName={sectorName}
        assessmentMode={assessment.mode}
        assessmentCycle={assessment.cycle}
        overallScore={overallScore}
        worstLevel={worstLevel}
        scores={enrichedScores}
        approvals={approvals}
      />
    </>
  )
}
