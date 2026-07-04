import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/server'
import { EmpresasSearch } from './EmpresasSearch'
import type { RiskLevel } from '@/types'

async function getCompanies() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select(`
      id, name, cnpj, created_at,
      sectors(
        id,
        assessments(
          risk_scores(level)
        )
      )
    `)
    .order('created_at', { ascending: false })
  return data ?? []
}

function getCompanyRisk(company: Awaited<ReturnType<typeof getCompanies>>[0]): RiskLevel | null {
  const order: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo']
  const allLevels = company.sectors
    .flatMap(s => s.assessments)
    .flatMap(a => a.risk_scores)
    .map(r => r.level as RiskLevel)
  for (const level of order) {
    if (allLevels.includes(level)) return level
  }
  return null
}

export default async function CompaniesPage() {
  const companies = await getCompanies()

  const rows = companies.map(c => ({
    id: c.id,
    name: c.name,
    cnpj: c.cnpj,
    created_at: c.created_at ?? '',
    sectorCount: c.sectors.length,
    risk: getCompanyRisk(c),
  }))

  return (
    <>
      <Header title="Empresas" />
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}
          </p>
          <Link href="/empresas/nova">
            <Button>+ Nova Empresa</Button>
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-400">Nenhuma empresa cadastrada.</p>
            <Link href="/empresas/nova">
              <Button className="mt-4">Cadastrar primeira empresa</Button>
            </Link>
          </div>
        ) : (
          <EmpresasSearch companies={rows} />
        )}
      </div>
    </>
  )
}
