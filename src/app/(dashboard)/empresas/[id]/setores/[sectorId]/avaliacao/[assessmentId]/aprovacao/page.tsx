import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { RiskBadge } from '@/components/features/RiskBadge'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types/database'

const APPROVAL_LABELS: Record<string, string> = {
  aprovado: 'Aprovado',
  com_ressalvas: 'Com Ressalvas',
  em_revisao: 'Em Revisão',
}

const APPROVAL_COLORS: Record<string, string> = {
  aprovado: 'bg-green-100 text-green-800 border border-green-200',
  com_ressalvas: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  em_revisao: 'bg-orange-100 text-orange-800 border border-orange-200',
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

  if (!assessment || !plan) return null

  const { data: approvals } = await supabase
    .from('approvals')
    .select('id, plan_id, status, approved_by, approved_at, notes, created_at')
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })

  const { data: scores } = await supabase
    .from('risk_scores')
    .select('factor_id, score, level')
    .eq('assessment_id', assessmentId)

  return { assessment, plan, approvals: approvals ?? [], scores: scores ?? [] }
}

export default async function AprovacaoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getData(assessmentId)
  if (!data) notFound()

  const { assessment, plan, approvals, scores } = data
  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'

  const RISK_ORDER: Record<string, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }
  const sortedScores = [...scores].sort(
    (a, b) => (RISK_ORDER[b.level] ?? 0) - (RISK_ORDER[a.level] ?? 0),
  )
  const worstLevel = (sortedScores[0]?.level ?? 'baixo') as RiskLevel

  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/aprovacao/${plan.id}`

  return (
    <>
      <Header title={`Aprovações — ${sectorName}`} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Info da avaliação */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{companyName}</h2>
                <p className="text-sm text-gray-500">
                  {sectorName} · Modo {assessment.mode} · Ciclo #{assessment.cycle}
                </p>
              </div>
              <RiskBadge level={worstLevel} />
            </div>
          </div>

          {/* Link de aprovação */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Link para aprovação do gestor
            </p>
            <p className="mt-1 font-mono text-sm text-blue-900 break-all">{approvalUrl}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={approvalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Abrir →
              </a>
              <a
                href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/apresentacao`}
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                ← Voltar à Apresentação
              </a>
            </div>
          </div>

          {/* Histórico */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="font-semibold text-gray-800">
                Histórico de Aprovações
                {approvals.length > 0 && (
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {approvals.length}
                  </span>
                )}
              </h3>
            </div>

            {approvals.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">Nenhuma aprovação registrada ainda.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Compartilhe o link acima com o gestor responsável.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {approvals.map(ap => (
                  <div key={ap.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{ap.approved_by}</p>
                        <p className="text-xs text-gray-400">
                          {ap.approved_at
                            ? new Date(ap.approved_at).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'long', year: 'numeric',
                              })
                            : formatDate(ap.created_at)}
                        </p>
                        {ap.notes && (
                          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <span className="font-medium">Observações: </span>
                            {ap.notes}
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${APPROVAL_COLORS[ap.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {APPROVAL_LABELS[ap.status] ?? ap.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
