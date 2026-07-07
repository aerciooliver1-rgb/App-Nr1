import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatDate } from '@/lib/utils'
import { RelatoriosClient } from './RelatoriosClient'

export interface SectorNav {
  id: string
  name: string
  lastDate: string | null
  lastStatus: string | null
  cycle: number | null
  /** Última avaliação calculada — alvo das etapas de navegação */
  assessmentId: string | null
  isCalc: boolean
  hasInterventions: boolean
  hasPlan: boolean
  planFinal: boolean
  hasApproval: boolean
  /** Coleta Modo B em andamento, se houver */
  coletaId: string | null
  /** Avaliação usada nas exportações (última Modo B calculada; senão a última calculada) */
  exportId: string | null
}

export interface CompanyNav {
  id: string
  name: string
  cnpj: string | null
  sectorCount: number
  lastGlobalDate: string | null
  /** Ao menos um setor com a última avaliação calculada — habilita o consolidado */
  hasCurrentResults: boolean
  sectors: SectorNav[]
}

async function getData(): Promise<CompanyNav[]> {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select(`
      id, name, cnpj,
      sectors(
        id, name, created_at,
        assessments(
          id, mode, status, cycle, created_at,
          interventions(count),
          action_plans(id, status, approvals(count), actions(count))
        )
      )
    `)
    .order('name')

  return (companies ?? []).map(company => {
    const sectors: SectorNav[] = [...company.sectors]
      .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
      .map(sector => {
        const assessments = [...sector.assessments].sort(
          (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
        )
        const last = assessments.at(-1) ?? null
        // As etapas seguem a ÚLTIMA avaliação do setor — a mesma cujo status
        // aparece no chip. Se ela ainda não foi calculada (em coleta/rascunho),
        // todas as etapas ficam bloqueadas até o ciclo fechar.
        const target = last
        const isCalc = last?.status === 'calculado'
        const calculados = assessments.filter(a => a.status === 'calculado')
        const exportTarget = isCalc
          ? ([...calculados].reverse().find(a => a.mode === 'B') ?? target)
          : null
        const coleta = [...assessments].reverse().find(a => a.status === 'em_coleta') ?? null

        type PlanRow = {
          id: string
          status: string
          approvals: { count: number }[] | null
          actions: { count: number }[] | null
        }
        const plan = (() => {
          const ap = target?.action_plans as unknown as PlanRow | PlanRow[] | null
          if (!ap) return null
          if (Array.isArray(ap)) return ap[0] ?? null
          return ap
        })()

        const interventionCount =
          (target?.interventions as unknown as { count: number }[] | null)?.[0]?.count ?? 0
        const approvalCount = plan?.approvals?.[0]?.count ?? 0
        const actionCount = plan?.actions?.[0]?.count ?? 0

        return {
          id: sector.id,
          name: sector.name,
          lastDate: last?.created_at ? formatDate(last.created_at) : null,
          lastStatus: last?.status ?? null,
          cycle: target?.cycle ?? null,
          assessmentId: target?.id ?? null,
          isCalc,
          // Etapa de intervenções concluída: intervenções registradas OU plano
          // com ações reais (planos rascunho vazios auto-criados não contam)
          hasInterventions: isCalc && (interventionCount > 0 || actionCount > 0),
          hasPlan: plan !== null,
          // planos legados usam 'em_andamento'; só 'rascunho' conta como não finalizado
          planFinal: plan !== null && plan.status !== 'rascunho',
          hasApproval: approvalCount > 0,
          coletaId: coleta?.id ?? null,
          exportId: exportTarget?.id ?? null,
        }
      })

    const lastGlobal = company.sectors
      .flatMap(s => s.assessments.map(a => a.created_at))
      .filter(Boolean)
      .sort()
      .at(-1)

    return {
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
      sectorCount: company.sectors.length,
      lastGlobalDate: lastGlobal ? formatDate(lastGlobal) : null,
      hasCurrentResults: sectors.some(s => s.isCalc),
      sectors,
    }
  })
}

export default async function RelatoriosPage() {
  const companies = await getData()

  return (
    <>
      <Header title="Relatórios" />
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-sm text-gray-400">
            Selecione uma empresa para ver as últimas avaliações e navegar pelas etapas do diagnóstico.
          </p>
          <RelatoriosClient companies={companies} />
        </div>
      </div>
    </>
  )
}
