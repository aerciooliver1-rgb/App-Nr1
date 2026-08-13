import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { IntervencoesClient } from './IntervencoesClient'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'
import type { Program } from '@/app/actions/interventions'

async function getData(assessmentId: string, userId: string) {
  const supabase = await createClient()

  const [{ data: assessment }, { data: scores }, { data: interventions }, { data: programs }] =
    await Promise.all([
      supabase
        .from('assessments')
        .select('id, mode, status, sectors(name)')
        .eq('id', assessmentId)
        .single(),
      supabase
        .from('risk_scores')
        .select('factor_id, score, level')
        .eq('assessment_id', assessmentId),
      supabase
        .from('interventions')
        .select('id, factor_id, program_id')
        .eq('assessment_id', assessmentId),
      supabase
        .from('programs')
        .select('id, name, description, type, factor_ids, level')
        .or(`type.eq.padrao,and(type.eq.personalizado,created_by.eq.${userId})`)
        .or('active.eq.true,type.eq.personalizado'),
    ])

  return { assessment, scores: scores ?? [], interventions: interventions ?? [], programs: programs ?? [] }
}

export default async function IntervencoesPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { assessment, scores, interventions, programs } = await getData(assessmentId, user.id)
  if (!assessment || assessment.status !== 'calculado') notFound()

  const sector = assessment.sectors as { name: string } | null
  const scoreMap = new Map(scores.map(s => [s.factor_id, { score: s.score, level: s.level as RiskLevel }]))

  // Enriquece fatores com seus scores
  const factorsWithScores = FACTORS.map(f => ({
    ...f,
    score: scoreMap.get(f.id)?.score ?? 0,
    level: (scoreMap.get(f.id)?.level ?? 'baixo') as RiskLevel,
  })).sort((a, b) => b.score - a.score)

  // Mapa de intervenções: factorId → programId[]
  const interventionMap: Record<string, string[]> = {}
  for (const inv of interventions) {
    if (!interventionMap[inv.factor_id]) interventionMap[inv.factor_id] = []
    interventionMap[inv.factor_id].push(inv.program_id)
  }

  const meusPrograms = (programs as Program[]).filter(p => p.type === 'personalizado')
  const catalogoPrograms = (programs as Program[]).filter(p => p.type === 'padrao')

  return (
    <>
      <Header title={`Intervenções — ${sector?.name ?? 'Setor'}`} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <IntervencoesClient
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            factors={factorsWithScores}
            initialInterventions={interventionMap}
            meusPrograms={meusPrograms}
            catalogoPrograms={catalogoPrograms}
          />
        </div>
      </div>
    </>
  )
}
