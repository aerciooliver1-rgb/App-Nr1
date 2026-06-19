import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PlanoClient } from './PlanoClient'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel, ActionStatus, ActionType } from '@/types/database'

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

export interface ActionRow {
  id: string
  plan_id: string
  description: string
  responsible: string
  due_date: string
  type: ActionType
  status: ActionStatus
  factor_id: string | null
  risk_level: RiskLevel | null
}

async function getData(assessmentId: string) {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('action_plans')
    .select('id, status, assessments(sectors(name, company_id:sectors(company_id)))')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!plan) return null

  const { data: actions } = await supabase
    .from('actions')
    .select('id, plan_id, description, responsible, due_date, type, status, factor_id, risk_level')
    .eq('plan_id', plan.id)

  const sorted = (actions ?? []).sort((a, b) => {
    const la = RISK_ORDER[a.risk_level as RiskLevel] ?? 0
    const lb = RISK_ORDER[b.risk_level as RiskLevel] ?? 0
    return lb - la
  })

  return { plan, actions: sorted as ActionRow[] }
}

export default async function PlanoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getData(assessmentId)
  if (!data) notFound()

  const { plan, actions } = data
  const factorMap = new Map(FACTORS.map(f => [f.id, f.name]))

  return (
    <>
      <Header title="Plano de Ação" />
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <PlanoClient
            planId={plan.id}
            planStatus={plan.status}
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            initialActions={actions}
            factorMap={Object.fromEntries(factorMap)}
          />
        </div>
      </div>
    </>
  )
}
