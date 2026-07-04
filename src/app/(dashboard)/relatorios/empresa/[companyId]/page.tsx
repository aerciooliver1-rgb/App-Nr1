import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CompanyReportCharts } from './CompanyReportCharts'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

const RISK_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getCompanyReport(companyId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select(`
      id, name, cnpj, created_at,
      sectors(
        id, name, employee_count,
        assessments(
          id, mode, status, cycle, created_at,
          risk_scores(factor_id, score, level)
        )
      )
    `)
    .eq('id', companyId)
    .single()
  return data
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CompanyReportPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  const company = await getCompanyReport(companyId)
  if (!company) notFound()

  const sectorCount = company.sectors.length
  const totalEmployees = company.sectors.reduce((sum, s) => sum + (s.employee_count ?? 0), 0)

  // Todas as avaliações concluídas, ordenadas por data
  const allAssessments = company.sectors
    .flatMap(sector =>
      (sector.assessments ?? [])
        .filter(a => a.status === 'calculado')
        .map(a => ({ ...a, sectorId: sector.id, sectorName: sector.name })),
    )
    .sort((a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
    )

  const modes = [...new Set(allAssessments.map(a => a.mode))].sort()

  // Processar dados para os cards de gráfico
  const chartData = allAssessments.map(a => {
    const scores = a.risk_scores ?? []

    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0

    const worstLevel = (
      [...scores].sort(
        (x, y) =>
          (RISK_ORDER[y.level as RiskLevel] ?? 0) -
          (RISK_ORDER[x.level as RiskLevel] ?? 0),
      )[0]?.level ?? 'baixo'
    ) as RiskLevel

    const dist: Record<string, number> = {}
    scores.forEach(s => {
      dist[s.level] = (dist[s.level] ?? 0) + 1
    })

    const pieData = (['critico', 'alto', 'moderado', 'baixo'] as RiskLevel[])
      .map(level => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: dist[level] ?? 0,
        color: RISK_COLORS[level],
      }))
      .filter(d => d.value > 0)

    return {
      assessmentId: a.id,
      sectorId: a.sectorId,
      companyId,
      sectorName: a.sectorName,
      cycle: a.cycle,
      mode: a.mode,
      date: formatDate(a.created_at ?? ''),
      overallScore,
      overallLevel: worstLevel,
      pieData,
    }
  })

  return (
    <>
      <Header title="Relatórios" />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── Cabeçalho da página ─────────────────────────────────────── */}
          <div className="flex items-start gap-4">
            <Link
              href="/relatorios"
              className="mt-1 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M10 12L6 8l4-4" />
              </svg>
              Relatórios
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
              <p className="mt-0.5 text-sm text-gray-400">Relatório consolidado</p>
            </div>
          </div>

          {/* ── Detalhes da empresa ─────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Detalhes da Empresa
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Razão Social</p>
                <p className="mt-1 font-medium text-gray-900">{company.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">CNPJ</p>
                <p className="mt-1 font-mono text-sm text-gray-900">{company.cnpj ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Setores</p>
                <p className="mt-1 font-medium text-gray-900">{sectorCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Funcionários</p>
                <p className="mt-1 font-medium text-gray-900">
                  {totalEmployees > 0 ? totalEmployees.toLocaleString('pt-BR') : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Avaliações concluídas</p>
                <p className="mt-1 font-medium text-gray-900">{allAssessments.length}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Tipos de teste</p>
                <p className="mt-1 font-medium text-gray-900">
                  {modes.length > 0 ? modes.map(m => `Modo ${m}`).join(' · ') : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Cadastro</p>
                <p className="mt-1 text-sm text-gray-900">{formatDate(company.created_at ?? '')}</p>
              </div>
            </div>
          </div>

          {/* ── Gráficos de avaliação ───────────────────────────────────── */}
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {chartData.length >= 2 ? 'Comparativo de Avaliações' : 'Resultado por Setor'}
            </h2>
            <CompanyReportCharts assessments={chartData} />
          </div>

        </div>
      </div>
    </>
  )
}
