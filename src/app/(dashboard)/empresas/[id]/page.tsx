import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/features/RiskBadge'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

async function getCompany(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select(`
      *,
      sectors(
        id, name, employee_count, created_at,
        assessments(
          id, status, cycle, created_at,
          risk_scores(factor_id, score, level)
        )
      )
    `)
    .eq('id', id)
    .single()
  return data
}

function getSectorRisk(sector: { assessments: { risk_scores: { level: string }[] }[] }): RiskLevel | null {
  const order: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo']
  const latest = sector.assessments.at(-1)
  if (!latest) return null
  const levels = latest.risk_scores.map(r => r.level as RiskLevel)
  for (const l of order) {
    if (levels.includes(l)) return l
  }
  return null
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await getCompany(id)
  if (!company) notFound()

  return (
    <>
      <Header title={company.name} />
      <div className="p-6 flex flex-col gap-6">

        {/* Dados da empresa */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Dados Cadastrais</h2>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-3">
            <div><dt className="text-gray-500">CNPJ</dt><dd className="font-medium">{company.cnpj}</dd></div>
            <div><dt className="text-gray-500">Porte</dt><dd className="font-medium">{company.size ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Setor Econômico</dt><dd className="font-medium">{company.economic_sector ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Contato</dt><dd className="font-medium">{company.contact_name ?? '—'}</dd></div>
            <div><dt className="text-gray-500">E-mail</dt><dd className="font-medium">{company.contact_email ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Cadastro</dt><dd className="font-medium">{formatDate(company.created_at)}</dd></div>
          </dl>
        </div>

        {/* Setores */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Setores</h2>
            <Link href={`/empresas/${id}/setores/novo`}>
              <Button size="sm">+ Novo Setor</Button>
            </Link>
          </div>

          {company.sectors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
              <p className="text-sm text-gray-400">Nenhum setor cadastrado.</p>
              <Link href={`/empresas/${id}/setores/novo`}>
                <Button size="sm" className="mt-3">Cadastrar setor</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {company.sectors.map((sector) => {
                const risk = getSectorRisk(sector)
                const lastAssessment = sector.assessments.at(-1)
                return (
                  <div key={sector.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-gray-900">{sector.name}</p>
                      <p className="text-xs text-gray-500">
                        {sector.employee_count} funcionário(s) ·{' '}
                        {sector.assessments.length} avaliação(ões)
                      </p>
                      {lastAssessment && (
                        <p className="text-xs text-gray-400">
                          Última: {formatDate(lastAssessment.created_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {risk && <RiskBadge level={risk} />}
                      <Link
                        href={`/empresas/${id}/setores/${sector.id}/avaliacao/nova`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Iniciar Avaliação
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Histórico de avaliações */}
        {company.sectors.some(s => s.assessments.length > 0) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Histórico de Avaliações</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Setor</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Ciclo</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Data</th>
                    <th className="px-4 py-3 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {company.sectors.flatMap(s =>
                    s.assessments.map(a => ({ ...a, sectorName: s.name }))
                  ).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
                  .map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{a.sectorName}</td>
                      <td className="px-4 py-3 text-gray-500">#{a.cycle}</td>
                      <td className="px-4 py-3 capitalize text-gray-500">{a.status}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        {a.status === 'calculado' && (
                          <Link href={`/empresas/${id}/setores/avaliacao/${a.id}/resultado`} className="text-xs text-blue-600 hover:underline">
                            Ver resultado
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
