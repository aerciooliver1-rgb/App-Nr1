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

export interface DocProgram {
  code: string | null
  name: string
  level: RiskLevel | null
  deliverable_title: string | null
  deliverable_content_label: string | null
  deliverable_content_fields: string | null
}

async function getData(assessmentId: string, companyId: string, userId: string) {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('action_plans')
    .select('id, status')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!plan) return null

  const [{ data: actions }, { data: company }, { data: profile }, { data: programs }] = await Promise.all([
    supabase
      .from('actions')
      .select('id, plan_id, description, responsible, due_date, type, status, factor_id, risk_level')
      .eq('plan_id', plan.id),
    supabase.from('companies').select('name').eq('id', companyId).single(),
    supabase.from('profiles').select('full_name, registro_profissional').eq('id', userId).single(),
    supabase
      .from('programs')
      .select('factor_ids, level, code, name, deliverable_title, deliverable_content_label, deliverable_content_fields')
      .eq('type', 'padrao')
      .eq('active', true),
  ])

  const sorted = (actions ?? []).sort((a, b) => {
    const la = RISK_ORDER[a.risk_level as RiskLevel] ?? 0
    const lb = RISK_ORDER[b.risk_level as RiskLevel] ?? 0
    return lb - la
  })

  const programByFactorLevel: Record<string, DocProgram> = {}
  for (const p of programs ?? []) {
    if (!p.factor_ids || !p.level) continue
    programByFactorLevel[`${p.factor_ids}-${p.level}`] = {
      code: p.code,
      name: p.name,
      level: p.level as RiskLevel,
      deliverable_title: p.deliverable_title,
      deliverable_content_label: p.deliverable_content_label,
      deliverable_content_fields: p.deliverable_content_fields,
    }
  }

  return {
    plan,
    actions: sorted as ActionRow[],
    companyName: company?.name ?? '',
    consultantName: profile?.full_name ?? '',
    consultantCRP: profile?.registro_profissional ?? '',
    programByFactorLevel,
  }
}

export default async function PlanoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const data = await getData(assessmentId, id, user.id)
  if (!data) notFound()

  const { plan, actions, companyName, consultantName, consultantCRP, programByFactorLevel } = data
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
            companyName={companyName}
            consultantName={consultantName}
            consultantCRP={consultantCRP}
            programByFactorLevel={programByFactorLevel}
          />
        </div>
      </div>
    </>
  )
}
