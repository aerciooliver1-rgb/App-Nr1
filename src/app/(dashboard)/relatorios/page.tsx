import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { RelatoriosClient } from './RelatoriosClient'
import type { RiskLevel } from '@/types/database'

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

export interface AssessmentRow {
  id: string
  mode: string
  cycle: number
  createdAt: string
  status: string
  companyId: string
  companyName: string
  sectorId: string
  sectorName: string
  overallScore: number
  worstLevel: RiskLevel
  criticalCount: number
  highCount: number
}

async function getData() {
  const supabase = await createClient()

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, mode, cycle, created_at, status, sectors(id, name, company_id, companies(id, name))')
    .eq('status', 'calculado')
    .order('created_at', { ascending: false })

  if (!assessments || assessments.length === 0) {
    return { rows: [], stats: { companies: 0, sectors: 0, assessments: 0, criticalRisks: 0 } }
  }

  const rows: AssessmentRow[] = await Promise.all(
    assessments.map(async a => {
      const sector = a.sectors as { id: string; name: string; company_id: string; companies: { id: string; name: string } | null } | null
      const { data: scores } = await supabase
        .from('risk_scores')
        .select('factor_id, score, level')
        .eq('assessment_id', a.id)

      const sorted = [...(scores ?? [])].sort(
        (x, y) => (RISK_ORDER[y.level as RiskLevel] ?? 0) - (RISK_ORDER[x.level as RiskLevel] ?? 0),
      )
      const overallScore = sorted.length > 0
        ? Math.round(sorted.reduce((s, r) => s + r.score, 0) / sorted.length)
        : 0

      return {
        id: a.id,
        mode: a.mode,
        cycle: a.cycle,
        createdAt: a.created_at ?? '',
        status: a.status,
        companyId: sector?.company_id ?? '',
        companyName: sector?.companies?.name ?? 'Empresa',
        sectorId: sector?.id ?? '',
        sectorName: sector?.name ?? 'Setor',
        overallScore,
        worstLevel: (sorted[0]?.level ?? 'baixo') as RiskLevel,
        criticalCount: sorted.filter(s => s.level === 'critico').length,
        highCount: sorted.filter(s => s.level === 'alto').length,
      }
    }),
  )

  const uniqueCompanies = new Set(rows.map(r => r.companyId)).size
  const uniqueSectors = new Set(rows.map(r => r.sectorId)).size
  const totalCritical = rows.reduce((sum, r) => sum + r.criticalCount, 0)

  return {
    rows,
    stats: {
      companies: uniqueCompanies,
      sectors: uniqueSectors,
      assessments: rows.length,
      criticalRisks: totalCritical,
    },
  }
}

export default async function RelatoriosPage() {
  const { rows, stats } = await getData()

  return (
    <>
      <Header title="Relatórios" />
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Cards de métricas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Empresas avaliadas',    value: stats.companies,    stripe: 'border-t-blue-500',    num: 'text-blue-700' },
              { label: 'Setores avaliados',      value: stats.sectors,      stripe: 'border-t-purple-500',  num: 'text-purple-700' },
              { label: 'Avaliações concluídas',  value: stats.assessments,  stripe: 'border-t-emerald-500', num: 'text-emerald-700' },
              { label: 'Fatores críticos',       value: stats.criticalRisks, stripe: 'border-t-red-500',    num: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border border-gray-200 border-t-4 bg-white p-5 shadow-sm ${s.stripe}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className={`mt-2 text-4xl font-bold tabular-nums ${s.num}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
              <p className="text-sm text-gray-400">Nenhuma avaliação concluída ainda.</p>
              <a
                href="/empresas"
                className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Iniciar avaliação
              </a>
            </div>
          ) : (
            <RelatoriosClient rows={rows} />
          )}
        </div>
      </div>
    </>
  )
}
