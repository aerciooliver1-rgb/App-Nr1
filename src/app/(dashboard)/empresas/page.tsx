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

const RISK_STRIPE: Record<RiskLevel, string> = {
  critico:  'border-l-red-500',
  alto:     'border-l-orange-400',
  moderado: 'border-l-amber-400',
  baixo:    'border-l-emerald-400',
}

export default async function CompaniesPage() {
  const companies = await getCompanies()

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
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="w-1 pl-0" />
                  <th className="px-5 py-3 font-medium text-gray-500">Empresa</th>
                  <th className="px-5 py-3 font-medium text-gray-500">CNPJ</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Setores</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Risco</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => {
                  const risk = getCompanyRisk(company)
                  return (
                    <tr
                      key={company.id}
                      className={`border-l-4 transition-colors hover:bg-gray-50 ${
                        risk ? RISK_STRIPE[risk] : 'border-l-transparent'
                      }`}
                    >
                      <td className="w-0 p-0" />
                      <td className="px-5 py-4">
                        <Link
                          href={`/empresas/${company.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {company.cnpj}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-semibold text-gray-600">
                          {company.sectors.length}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {risk
                          ? <RiskBadge level={risk} />
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {formatDate(company.created_at)}
                      </td>
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
