import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { HistoricoClient } from './HistoricoClient'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

export interface CycleData {
  assessmentId: string
  cycle: number
  mode: string
  createdAt: string
  status: string
  scores: { factorId: string; score: number; level: RiskLevel }[]
  overallScore: number
  worstLevel: RiskLevel
}

async function getData(sectorId: string) {
  const supabase = await createClient()

  const { data: sector } = await supabase
    .from('sectors')
    .select('id, name, company_id, companies(name)')
    .eq('id', sectorId)
    .single()

  if (!sector) return null

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, mode, cycle, created_at, status')
    .eq('sector_id', sectorId)
    .order('cycle', { ascending: true })

  if (!assessments || assessments.length === 0) return { sector, cycles: [] }

  const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

  const cycles: CycleData[] = await Promise.all(
    assessments.map(async a => {
      const { data: scores } = await supabase
        .from('risk_scores')
        .select('factor_id, score, level')
        .eq('assessment_id', a.id)

      const mapped = (scores ?? []).map(s => ({
        factorId: s.factor_id,
        score: s.score,
        level: s.level as RiskLevel,
      }))

      const overallScore = mapped.length > 0
        ? Math.round(mapped.reduce((sum, s) => sum + s.score, 0) / mapped.length)
        : 0

      const worstLevel: RiskLevel = mapped.sort(
        (a, b) => (RISK_ORDER[b.level] ?? 0) - (RISK_ORDER[a.level] ?? 0),
      )[0]?.level ?? 'baixo'

      return {
        assessmentId: a.id,
        cycle: a.cycle,
        mode: a.mode,
        createdAt: a.created_at ?? '',
        status: a.status,
        scores: mapped,
        overallScore,
        worstLevel,
      }
    }),
  )

  return { sector, cycles }
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string }>
}) {
  const { id, sectorId } = await params
  const data = await getData(sectorId)
  if (!data) notFound()

  const { sector, cycles } = data
  const sectorTyped = sector as { id: string; name: string; company_id: string; companies: { name: string } | null }
  const companyName = sectorTyped.companies?.name ?? 'Empresa'
  const sectorName = sectorTyped.name

  const latestAssessmentId = cycles[cycles.length - 1]?.assessmentId

  return (
    <>
      <Header title={`Histórico — ${sectorName}`} />
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{companyName}</h2>
                <p className="text-sm text-gray-500">{sectorName} · {cycles.length} ciclo(s) de avaliação</p>
              </div>
              <a
                href={`/empresas/${id}/setores/${sectorId}/avaliacao/nova`}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Nova Avaliação
              </a>
            </div>
          </div>

          {cycles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-sm text-gray-400">Nenhuma avaliação concluída neste setor.</p>
              <a
                href={`/empresas/${id}/setores/${sectorId}/avaliacao/nova`}
                className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Iniciar Primeira Avaliação
              </a>
            </div>
          ) : (
            <HistoricoClient
              cycles={cycles}
              factors={FACTORS}
              companyId={id}
              sectorId={sectorId}
              latestAssessmentId={latestAssessmentId ?? ''}
              lastAssessmentDate={cycles[cycles.length - 1]?.createdAt ?? null}
            />
          )}
        </div>
      </div>
    </>
  )
}
