import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { RiskBadge } from '@/components/features/RiskBadge'
import { RiskChart } from './RiskChart'
import { FACTORS } from '@/lib/data/questions'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const RISK_STRIPE: Record<RiskLevel, string> = {
  baixo:    'border-t-emerald-500',
  moderado: 'border-t-amber-500',
  alto:     'border-t-orange-500',
  critico:  'border-t-red-600',
}

const RISK_BAR: Record<RiskLevel, string> = {
  baixo:    'bg-emerald-500',
  moderado: 'bg-amber-500',
  alto:     'bg-orange-500',
  critico:  'bg-red-600',
}

async function getResultado(assessmentId: string) {
  const supabase = await createClient()

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, mode, status, cycle, created_at, sectors(name)')
    .eq('id', assessmentId)
    .single()

  if (!assessment || assessment.status !== 'calculado') return null

  const { data: scores } = await supabase
    .from('risk_scores')
    .select('factor_id, score, level, calculated_at')
    .eq('assessment_id', assessmentId)

  return { assessment, scores: scores ?? [] }
}

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getResultado(assessmentId)
  if (!data) notFound()

  const { assessment, scores } = data
  const sector = assessment.sectors as { name: string } | null

  const chartData = FACTORS.map(factor => {
    const score = scores.find(s => s.factor_id === factor.id)
    return {
      factorId: factor.id,
      name: factor.id,
      fullName: factor.name,
      score: score?.score ?? 0,
      level: (score?.level ?? 'baixo') as RiskLevel,
    }
  }).sort((a, b) => b.score - a.score)

  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0
  const overallLevel: RiskLevel =
    overallScore <= 25 ? 'baixo' : overallScore <= 50 ? 'moderado' : overallScore <= 75 ? 'alto' : 'critico'

  const critical = chartData.filter(d => d.level === 'critico')
  const high = chartData.filter(d => d.level === 'alto')

  return (
    <>
      <Header title={`Resultado — ${sector?.name ?? 'Setor'}`} />
      <div className="p-6 flex flex-col gap-6">

        {/* Score geral */}
        <div className={`rounded-xl border border-gray-200 border-t-4 bg-white p-6 shadow-sm ${RISK_STRIPE[overallLevel]}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Score geral do setor</p>
              <p className="mt-1 text-5xl font-bold tabular-nums text-gray-900">
                {overallScore}
                <span className="text-2xl font-normal text-gray-300">/100</span>
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Modo {assessment.mode} · Ciclo #{assessment.cycle} · {formatDate(assessment.created_at)}
              </p>
            </div>
            <RiskBadge level={overallLevel} className="text-sm px-3 py-1" />
          </div>
        </div>

        {/* Alertas críticos/altos */}
        {(critical.length > 0 || high.length > 0) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
              Fatores que exigem ação imediata
            </p>
            <div className="flex flex-wrap gap-2">
              {[...critical, ...high].map(f => (
                <span
                  key={f.factorId}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700"
                >
                  {f.factorId} — {f.fullName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Score por Fator de Risco
          </h2>
          <RiskChart data={chartData} />
        </div>

        {/* Ranking detalhado */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ranking de Fatores</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {chartData.map((item, index) => {
              const factor = FACTORS.find(f => f.id === item.factorId)!
              return (
                <div key={item.factorId} className="flex items-center gap-4 px-6 py-4">
                  <span className="w-6 shrink-0 text-sm font-bold text-gray-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{factor.name}</p>
                    <p className="text-xs text-gray-400">{factor.dimension}</p>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-1 rounded-full ${RISK_BAR[item.level]}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="w-10 text-right text-sm font-bold tabular-nums text-gray-700">
                      {item.score.toFixed(0)}
                    </span>
                    <RiskBadge level={item.level} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navegação */}
        <div className="flex gap-3">
          <Link
            href={`/empresas/${id}`}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Empresa
          </Link>
          <Link
            href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/intervencoes`}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Avançar para Intervenções →
          </Link>
        </div>
      </div>
    </>
  )
}
