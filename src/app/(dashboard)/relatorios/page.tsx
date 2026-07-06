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
  hasPlan: boolean
  planFinal: boolean
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
          action_plans(id, status)
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
        const calculados = assessments.filter(a => a.status === 'calculado')
        const target = calculados.at(-1) ?? null
        const exportTarget = [...calculados].reverse().find(a => a.mode === 'B') ?? target
        const coleta = [...assessments].reverse().find(a => a.status === 'em_coleta') ?? null

        const plan = (() => {
          const ap = target?.action_plans
          if (!ap) return null
          if (Array.isArray(ap)) return (ap as { id: string; status: string }[])[0] ?? null
          return ap as { id: string; status: string }
        })()

        return {
          id: sector.id,
          name: sector.name,
          lastDate: last?.created_at ? formatDate(last.created_at) : null,
          lastStatus: last?.status ?? null,
          cycle: target?.cycle ?? last?.cycle ?? null,
          assessmentId: target?.id ?? null,
          isCalc: target !== null,
          hasPlan: plan !== null,
          planFinal: plan?.status === 'finalizado',
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
