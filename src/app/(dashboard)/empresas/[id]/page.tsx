import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/features/RiskBadge'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'
import { CompanyTabs } from './CompanyTabs'
import type { AvaliacaoRow, SectorCardData, SectorScoreBar, StatusData } from './CompanyTabs'

const RISK_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  critico: 'Crítico', alto: 'Alto', moderado: 'Moderado', baixo: 'Baixo',
}

function scoreToLevel(score: number): RiskLevel {
  return score <= 25 ? 'baixo' : score <= 50 ? 'moderado' : score <= 75 ? 'alto' : 'critico'
}

async function getCompany(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select(`
      *,
      sectors(
        id, name, employee_count, manager_name, created_at,
        assessments(
          id, mode, status, cycle, created_at,
          risk_scores(factor_id, score, level)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (data) {
    // Ordem estável: setores por criação; avaliações da mais antiga à mais nova
    data.sectors.sort((a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
    data.sectors.forEach(s => s.assessments.sort((a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()))
  }
  return data
}

function getWorstRisk(risks: (RiskLevel | null)[]): RiskLevel | null {
  const order: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo']
  for (const l of order) {
    if (risks.includes(l)) return l
  }
  return null
}

const RISK_BORDER: Record<RiskLevel, string> = {
  critico:  'border-red-200  bg-red-50',
  alto:     'border-orange-200 bg-orange-50',
  moderado: 'border-amber-200  bg-amber-50',
  baixo:    'border-emerald-200 bg-emerald-50',
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await getCompany(id)
  if (!company) notFound()

  // ── Última avaliação calculada de cada setor (base do Status Atual) ─────────
  const latestBySector = company.sectors.map(sector => {
    const latest = [...sector.assessments]
      .filter(a => a.status === 'calculado' && a.risk_scores.length > 0)
      .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
      .at(-1)
    return { sector, latest: latest ?? null }
  })

  const bars: SectorScoreBar[] = latestBySector
    .filter(({ latest }) => latest !== null)
    .map(({ sector, latest }) => {
      const scores = latest!.risk_scores
      const score = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      return { sectorId: sector.id, name: sector.name, score, level: scoreToLevel(score) }
    })

  const allFactorScores = latestBySector.flatMap(({ latest }) => latest?.risk_scores ?? [])
  const overallScore = allFactorScores.length > 0
    ? Math.round(allFactorScores.reduce((sum, s) => sum + s.score, 0) / allFactorScores.length)
    : 0

  const dist: Record<string, number> = {}
  allFactorScores.forEach(s => { dist[s.level] = (dist[s.level] ?? 0) + 1 })
  const donut = (['critico', 'alto', 'moderado', 'baixo'] as RiskLevel[])
    .map(level => ({ name: RISK_LABEL[level], value: dist[level] ?? 0, color: RISK_COLORS[level] }))
    .filter(d => d.value > 0)

  const status: StatusData = {
    overallScore,
    overallLevel: scoreToLevel(overallScore),
    donut,
    bars,
    evaluatedSectors: bars.length,
    totalSectors: company.sectors.length,
  }

  // ── Cards de setor ──────────────────────────────────────────────────────────
  const sectorRisks = latestBySector.map(({ latest }) => {
    if (!latest) return null
    const score = Math.round(latest.risk_scores.reduce((sum, s) => sum + s.score, 0) / latest.risk_scores.length)
    return scoreToLevel(score)
  })

  const sectorCards: SectorCardData[] = company.sectors.map((sector, i) => {
    const lastAssessment = sector.assessments.at(-1)
    return {
      id: sector.id,
      name: sector.name,
      employeeCount: sector.employee_count ?? 0,
      managerName: sector.manager_name,
      assessmentCount: sector.assessments.length,
      lastCycle: lastAssessment?.cycle ?? null,
      lastDate: lastAssessment?.created_at ? formatDate(lastAssessment.created_at) : null,
      risk: sectorRisks[i],
    }
  })

  // ── Resultados globais por data ─────────────────────────────────────────────
  const avaliacoes: AvaliacaoRow[] = company.sectors
    .flatMap(sector =>
      sector.assessments.map(a => {
        const scores = a.risk_scores
        const score = a.status === 'calculado' && scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : null
        return {
          id: a.id,
          sectorId: sector.id,
          sectorName: sector.name,
          cycle: a.cycle,
          mode: a.mode,
          status: a.status,
          date: a.created_at ? formatDate(a.created_at) : null,
          score,
          level: score !== null ? scoreToLevel(score) : null,
          createdAt: a.created_at,
        }
      }),
    )
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .map(({ createdAt: _createdAt, ...row }) => row)

  // ── Métricas rápidas ────────────────────────────────────────────────────────
  const worstRisk = getWorstRisk(sectorRisks)
  const totalAssessments = company.sectors.reduce((sum, s) => sum + s.assessments.length, 0)
  const lastDate = company.sectors
    .flatMap(s => s.assessments)
    .map(a => a.created_at)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <>
      <Header title={company.name} />
      <div className="p-6 flex flex-col gap-6">

        {/* Métricas rápidas */}
        <div className="flex flex-wrap gap-3">
          {worstRisk && (
            <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${RISK_BORDER[worstRisk]}`}>
              <span className="text-xs font-medium text-gray-500">Pior risco</span>
              <RiskBadge level={worstRisk} />
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
            <span className="text-xs font-medium text-gray-400">Setores</span>
            <span className="text-sm font-bold text-gray-900">{company.sectors.length}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
            <span className="text-xs font-medium text-gray-400">Avaliações</span>
            <span className="text-sm font-bold text-gray-900">{totalAssessments}</span>
          </div>
          {lastDate && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
              <span className="text-xs font-medium text-gray-400">Última avaliação</span>
              <span className="text-sm font-bold text-gray-900">{formatDate(lastDate)}</span>
            </div>
          )}
        </div>

        {/* Dados da empresa */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Dados Cadastrais
            </h2>
            <Link href={`/empresas/${id}/editar`}>
              <Button size="sm" variant="secondary">Editar</Button>
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-400">CNPJ</dt>
              <dd className="mt-0.5 font-mono font-medium text-gray-800">{company.cnpj}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Porte</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{company.size ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Setor Econômico</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{company.economic_sector ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Contato</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{company.contact_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">E-mail</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{company.contact_email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Cadastro</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{formatDate(company.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Abas: Status Atual · Setores · Avaliações */}
        <CompanyTabs
          companyId={id}
          status={status}
          sectors={sectorCards}
          avaliacoes={avaliacoes}
        />
      </div>
    </>
  )
}
