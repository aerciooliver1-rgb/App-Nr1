import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AcompanhamentoClient } from './AcompanhamentoClient'
import { syncOverdueActions } from '@/app/actions/tracking'
import { FACTORS } from '@/lib/data/questions'
import type { ActionStatus, RiskLevel } from '@/types/database'

export interface KanbanAction {
  id: string
  plan_id: string
  description: string
  responsible: string
  due_date: string | null
  type: string
  status: ActionStatus
  factor_id: string | null
  risk_level: RiskLevel | null
  factorName?: string
}

async function getData(assessmentId: string) {
  const supabase = await createClient()

  const [{ data: assessment }, { data: plan }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, mode, cycle, sectors(name, companies(name))')
      .eq('id', assessmentId)
      .single(),
    supabase
      .from('action_plans')
      .select('id, status')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
  ])

  if (!assessment) return null
  if (!plan) return { assessment, plan: null, actions: [] as KanbanAction[] }

  // Sincroniza ações atrasadas antes de renderizar
  await syncOverdueActions(plan.id)

  const { data: actions } = await supabase
    .from('actions')
    .select('id, plan_id, description, responsible, due_date, type, status, factor_id, risk_level')
    .eq('plan_id', plan.id)

  const factorMap = new Map(FACTORS.map(f => [f.id, f.name]))
  const enriched: KanbanAction[] = (actions ?? []).map(a => ({
    ...a,
    status: a.status as ActionStatus,
    risk_level: a.risk_level as RiskLevel | null,
    factorName: a.factor_id ? factorMap.get(a.factor_id) : undefined,
  }))

  return { assessment, plan, actions: enriched }
}

export default async function AcompanhamentoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getData(assessmentId)
  if (!data) notFound()

  const { assessment, plan, actions } = data
  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const sectorName = sector?.name ?? 'Setor'

  if (!plan) {
    return (
      <>
        <Header title={`Acompanhamento — ${sectorName}`} />
        <div className="p-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-8 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Este ciclo não tem plano de ação</h3>
              <p className="mt-1.5 text-sm text-gray-400">
                Score de risco baixo — intervenção não é obrigatória neste ciclo.<br />
                Se quiser mesmo assim aplicar alguma ação preventiva, comece pelas intervenções.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <a
                  href={`/empresas/${id}/setores/${sectorId}/historico`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ← Histórico de Ciclos
                </a>
                <a
                  href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/intervencoes`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Adicionar intervenção
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const total = actions.length
  const concluidas = actions.filter(a => a.status === 'concluida').length
  const atrasadas = actions.filter(a => a.status === 'atrasada').length
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0

  return (
    <>
      <Header title={`Acompanhamento — ${sectorName}`} />
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Progresso geral */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: total, color: 'text-gray-900' },
              { label: 'Concluídas', value: concluidas, color: 'text-green-700' },
              { label: 'Atrasadas', value: atrasadas, color: 'text-red-700' },
              { label: 'Progresso', value: `${pct}%`, color: pct === 100 ? 'text-green-700' : 'text-blue-700' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-400">{stat.label}</p>
                <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Barra de progresso */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Progresso do plano — Ciclo #{assessment.cycle}</span>
              <span className="font-semibold text-gray-700">{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Kanban / Lista */}
          <AcompanhamentoClient
            initialActions={actions}
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            planId={plan.id}
          />

          {/* Link histórico */}
          <div className="flex justify-between pt-2">
            <a
              href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/apresentacao`}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Apresentação
            </a>
            <a
              href={`/empresas/${id}/setores/${sectorId}/historico`}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Histórico de Ciclos →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
