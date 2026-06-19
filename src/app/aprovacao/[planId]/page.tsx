import { createServiceClient } from '@/lib/supabase/server'
import { AprovacaoForm } from './AprovacaoForm'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

const LEVEL_LABELS: Record<RiskLevel, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  baixo: 'bg-green-100 text-green-800',
  moderado: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-orange-100 text-orange-800',
  critico: 'bg-red-100 text-red-800',
}

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

async function getData(planId: string) {
  const supabase = await createServiceClient()

  const { data: plan } = await supabase
    .from('action_plans')
    .select('id, status, assessment_id, assessments(id, mode, cycle, created_at, sectors(name, companies(name)))')
    .eq('id', planId)
    .maybeSingle()

  if (!plan) return null

  const assessmentId = plan.assessment_id

  const [{ data: scores }, { data: actions }, { data: approvals }] = await Promise.all([
    supabase
      .from('risk_scores')
      .select('factor_id, score, level')
      .eq('assessment_id', assessmentId),
    supabase
      .from('actions')
      .select('id, description, responsible, due_date, type, risk_level')
      .eq('plan_id', planId),
    supabase
      .from('approvals')
      .select('id, status, approved_by, approved_at, notes, created_at')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false }),
  ])

  return { plan, scores: scores ?? [], actions: actions ?? [], approvals: approvals ?? [] }
}

export default async function PublicAprovacaoPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const data = await getData(planId)

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🔒</p>
          <h1 className="mt-4 text-lg font-bold text-gray-900">Link inválido</h1>
          <p className="mt-2 text-sm text-gray-500">
            Este plano não foi encontrado ou o link é inválido.
          </p>
        </div>
      </div>
    )
  }

  const { plan, scores, actions, approvals } = data
  const assessment = plan.assessments as {
    id: string; mode: string; cycle: number; created_at: string | null
    sectors: { name: string; companies: { name: string } | null } | null
  } | null

  const sector = assessment?.sectors
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'
  const assessmentDate = assessment?.created_at
    ? new Date(assessment.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—'

  const sortedScores = [...scores].sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel = (sortedScores[0]?.level ?? 'baixo') as RiskLevel

  const sortedActions = [...actions].sort(
    (a, b) =>
      (RISK_ORDER[(b.risk_level ?? 'baixo') as RiskLevel] ?? 0) -
      (RISK_ORDER[(a.risk_level ?? 'baixo') as RiskLevel] ?? 0),
  )

  const latestApproval = approvals[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              NR-1 · Portaria MTE nº 1.419/2024
            </p>
            <h1 className="mt-0.5 text-lg font-bold text-gray-900">
              Diagnóstico de Riscos Psicossociais
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Modo {assessment?.mode} · Ciclo #{assessment?.cycle}</p>
            <p className="text-xs text-gray-400">{assessmentDate}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Empresa e score geral */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
              <p className="text-sm text-gray-500">Setor: {sectorName}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{overallScore}</p>
                <p className="text-xs text-gray-400">Score geral /100</p>
              </div>
              <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${LEVEL_COLORS[worstLevel]}`}>
                {LEVEL_LABELS[worstLevel]}
              </span>
            </div>
          </div>
        </div>

        {/* Fatores de risco */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="font-semibold text-gray-800">Fatores de Risco Psicossocial</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Fator</th>
                  <th className="px-4 py-2 text-right font-medium">Score</th>
                  <th className="px-4 py-2 text-center font-medium">Nível</th>
                </tr>
              </thead>
              <tbody>
                {sortedScores.map(s => {
                  const factor = FACTORS.find(f => f.id === s.factor_id)
                  const level = s.level as RiskLevel
                  return (
                    <tr key={s.factor_id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 text-gray-800">
                        <span className="font-mono text-xs text-gray-400 mr-2">{s.factor_id}</span>
                        {factor?.name ?? s.factor_id}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{s.score.toFixed(0)}/100</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLORS[level]}`}>
                          {LEVEL_LABELS[level]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plano de ação */}
        {sortedActions.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="font-semibold text-gray-800">
                Plano de Ação ({sortedActions.length} ações)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2 text-left font-medium">Ação</th>
                    <th className="px-4 py-2 text-left font-medium">Responsável</th>
                    <th className="px-4 py-2 text-center font-medium">Prazo</th>
                    <th className="px-4 py-2 text-center font-medium">Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActions.map(a => {
                    const level = (a.risk_level ?? 'baixo') as RiskLevel
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="px-4 py-2.5 text-gray-800">{a.description}</td>
                        <td className="px-4 py-2.5 text-gray-600">{a.responsible || '—'}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                          {a.due_date
                            ? new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLORS[level]}`}>
                            {LEVEL_LABELS[level]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aprovação existente */}
        {latestApproval && (
          <div className={`rounded-xl border p-5 ${
            latestApproval.status === 'aprovado'
              ? 'border-green-200 bg-green-50'
              : latestApproval.status === 'com_ressalvas'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-orange-200 bg-orange-50'
          }`}>
            <p className="font-semibold text-gray-900">
              Este plano já foi avaliado por <strong>{latestApproval.approved_by}</strong>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Status:{' '}
              <strong>
                {latestApproval.status === 'aprovado'
                  ? 'Aprovado'
                  : latestApproval.status === 'com_ressalvas'
                  ? 'Aprovado com Ressalvas'
                  : 'Em Revisão'}
              </strong>
            </p>
            {latestApproval.notes && (
              <p className="mt-2 text-sm text-gray-700">
                <strong>Observações:</strong> {latestApproval.notes}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-500 italic">
              Você pode registrar uma nova revisão abaixo.
            </p>
          </div>
        )}

        {/* Formulário de aprovação */}
        <AprovacaoForm planId={planId} />

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Sistema de Gestão de Riscos Psicossociais · NR-1 / Portaria MTE nº 1.419/2024
        </p>
      </div>
    </div>
  )
}
