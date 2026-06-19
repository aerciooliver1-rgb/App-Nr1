import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { RiskBadge } from '@/components/features/RiskBadge'
import { RiskChart } from './RiskChart'
import { FACTORS } from '@/lib/data/questions'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const CONSEQUENCE_MAP: Record<string, string> = {
  'Transtorno mental': 'Transtorno mental',
  'Transtorno mental; DORT': 'Transtorno mental, DORT',
  'Transtorno mental; Fadiga': 'Transtorno mental, Fadiga',
}

const RISK_THRESHOLD: Record<RiskLevel, string> = {
  baixo: '0–25 pontos',
  moderado: '26–50 pontos',
  alto: '51–75 pontos',
  critico: '76–100 pontos',
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

  // Enriquece com dados dos fatores para o gráfico
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
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Score geral do setor</p>
              <p className="mt-1 text-4xl font-bold text-gray-900">{overallScore}<span className="text-xl text-gray-400">/100</span></p>
              <p className="mt-1 text-sm text-gray-400">
                Modo {assessment.mode} · Ciclo #{assessment.cycle} · {formatDate(assessment.created_at)}
              </p>
            </div>
            <RiskBadge level={overallLevel} className="text-base px-4 py-2" />
          </div>
        </div>

        {/* Alertas críticos/altos */}
        {(critical.length > 0 || high.length > 0) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">Fatores que exigem ação imediata:</p>
            <div className="flex flex-wrap gap-2">
              {[...critical, ...high].map(f => (
                <span key={f.factorId} className="rounded-full bg-white border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                  {f.factorId} — {f.fullName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Score por Fator de Risco</h2>
          <RiskChart data={chartData} />
        </div>

        {/* Ranking detalhado */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Ranking de Fatores</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {chartData.map((item, index) => {
              const factor = FACTORS.find(f => f.id === item.factorId)!
              return (
                <div key={item.factorId} className="flex items-center gap-4 px-6 py-4">
                  <span className="w-6 shrink-0 text-sm font-bold text-gray-300">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{factor.name}</p>
                    <p className="text-xs text-gray-400">{factor.dimension} · {RISK_THRESHOLD[item.level]}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{item.score.toFixed(0)}</span>
                    <RiskBadge level={item.level} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Próximo passo */}
        <div className="flex gap-3">
          <Link
            href={`/empresas/${id}`}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Voltar à empresa
          </Link>
          <Link
            href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/intervencoes`}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Avançar para Intervenções →
          </Link>
        </div>
      </div>
    </>
  )
}
