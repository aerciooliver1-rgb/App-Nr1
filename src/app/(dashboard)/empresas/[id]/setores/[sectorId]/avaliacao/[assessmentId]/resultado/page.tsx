import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RiskBadge } from '@/components/features/RiskBadge'
import { RiskChart } from './RiskChart'
import { ExportButton } from './ExportButton'
import { FACTORS } from '@/lib/data/questions'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

// ── Gauge circular SVG ────────────────────────────────────────────────────────

const GAUGE_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

function ScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const r = 60, cx = 80, cy = 80
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={GAUGE_COLORS[level]} strokeWidth="14"
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f172a">
        {score}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fill="#94a3b8">
        de 100
      </text>
    </svg>
  )
}

// ── Mapeamento de cores ───────────────────────────────────────────────────────

const RISK_BAR: Record<RiskLevel, string> = {
  baixo:    'bg-emerald-500',
  moderado: 'bg-amber-500',
  alto:     'bg-orange-500',
  critico:  'bg-red-600',
}

const PRIORITY_BADGE: Record<RiskLevel, string> = {
  baixo:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderado: 'bg-amber-50 text-amber-700 border-amber-200',
  alto:     'bg-orange-50 text-orange-700 border-orange-200',
  critico:  'bg-red-50 text-red-700 border-red-200',
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getResultado(assessmentId: string) {
  const supabase = await createClient()

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, mode, status, cycle, created_at, sectors(name, companies(name))')
    .eq('id', assessmentId)
    .single()

  if (!assessment || assessment.status !== 'calculado') return null

  const { data: scores } = await supabase
    .from('risk_scores')
    .select('factor_id, score, level, calculated_at')
    .eq('assessment_id', assessmentId)

  return { assessment, scores: scores ?? [] }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getResultado(assessmentId)
  if (!data) notFound()

  const { assessment, scores } = data
  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const empresaName = sector?.companies?.name ?? null

  // Chart: ordem original dos fatores (F01 → F13)
  const chartData = FACTORS.map(factor => {
    const s = scores.find(x => x.factor_id === factor.id)
    return {
      factorId: factor.id,
      name: factor.id,
      fullName: factor.name,
      score: s?.score ?? 0,
      level: (s?.level ?? 'baixo') as RiskLevel,
    }
  })

  // Ranking: ordenado do mais crítico ao menos
  const rankingData = [...chartData].sort((a, b) => b.score - a.score)

  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0
  const overallLevel: RiskLevel =
    overallScore <= 25 ? 'baixo' : overallScore <= 50 ? 'moderado' : overallScore <= 75 ? 'alto' : 'critico'

  const prioritarios = rankingData.slice(0, 4)

  return (
    <div className="flex flex-col">

      {/* ── Sub-header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-start gap-4">
          <Link
            href={`/empresas/${id}`}
            className="mt-1 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Resultado do Diagnóstico</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {empresaName ?? 'Empresa'} · {sector?.name ?? 'Setor'}
            </p>
          </div>
        </div>
        <ExportButton />
      </div>

      <div className="flex flex-col gap-5 p-6">

        {/* ── Linha 1: gauge + gráfico ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">

          {/* Score gauge */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
            <ScoreGauge score={overallScore} level={overallLevel} />
            <RiskBadge level={overallLevel} className="px-4 py-1.5 text-sm" />
            <p className="text-xs text-gray-400">
              Modo {assessment.mode} · Ciclo #{assessment.cycle}
            </p>
            <p className="text-xs text-gray-300">{formatDate(assessment.created_at)}</p>
          </div>

          {/* Gráfico de barras */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Score por fator (0–100)
            </h2>
            <RiskChart data={chartData} />
          </div>
        </div>

        {/* ── Linha 2: ranking + painel lateral ───────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_256px]">

          {/* Ranking */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                <path d="M2 4h12M2 8h8M2 12h5" />
              </svg>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Ranking dos fatores — do mais crítico ao menos
              </h2>
            </div>

            <div className="divide-y divide-gray-50">
              {rankingData.map((item) => {
                const factor = FACTORS.find(f => f.id === item.factorId)!
                return (
                  <div key={item.factorId} className="flex items-center gap-4 px-6 py-3.5">
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${PRIORITY_BADGE[item.level]}`}>
                      {item.factorId}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{factor.name}</p>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1 rounded-full ${RISK_BAR[item.level]}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="w-8 text-right text-sm font-bold tabular-nums text-gray-700">
                        {item.score.toFixed(0)}
                      </span>
                      <RiskBadge level={item.level} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="flex flex-col gap-4">

            {/* Fatores prioritários */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-orange-500">
                  <path d="M8 1v6l3 3M8 1a7 7 0 100 14A7 7 0 008 1z" />
                </svg>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Fatores prioritários
                </h3>
              </div>
              <div className="space-y-2">
                {prioritarios.map(item => {
                  const factor = FACTORS.find(f => f.id === item.factorId)!
                  return (
                    <div key={item.factorId}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${PRIORITY_BADGE[item.level]}`}>
                        {item.factorId}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">
                        {factor.name}
                      </p>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-gray-700">
                        {item.score.toFixed(0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Conformidade NR-1 */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500">
                  <path d="M8 1.5l5 2v4c0 3-2.5 5.5-5 6.5C5.5 13 3 10.5 3 7.5v-4l5-2z" />
                  <path d="M6 8l1.5 1.5L10 6" />
                </svg>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Conformidade NR-1
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-blue-600">
                Este relatório integra o Inventário de Riscos do PGR conforme NR-1 subitem
                1.5.7.3.2 e a Portaria MTE nº 1.419/2024.
              </p>
            </div>

          </div>
        </div>

        {/* ── Navegação ─────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Link
            href={`/empresas/${id}`}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            ← Empresa
          </Link>
          <Link
            href={`/empresas/${id}/setores/${sectorId}/avaliacao/${assessmentId}/intervencoes`}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Avançar para Intervenções →
          </Link>
        </div>

      </div>
    </div>
  )
}
