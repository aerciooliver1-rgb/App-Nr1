import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/features/RiskBadge'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
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

  return (
    <>
      <Header title="Empresas" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">{companies.length} empresa(s) cadastrada(s)</p>
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
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Empresa</th>
                  <th className="px-6 py-3 font-medium text-gray-500">CNPJ</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Setores</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Risco</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => {
                  const risk = getCompanyRisk(company)
                  return (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/empresas/${company.id}`} className="font-medium text-blue-600 hover:underline">
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{company.cnpj}</td>
                      <td className="px-6 py-4 text-gray-500">{company.sectors.length}</td>
                      <td className="px-6 py-4">
                        {risk ? <RiskBadge level={risk} /> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(company.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
