import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/features/RiskBadge'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'
import { HistoricoTable } from './HistoricoTable'
import type { AssessmentRow } from './HistoricoTable'

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
          risk_scores(factor_id, score, level),
          action_plans(id, status)
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

  const sectorRisks = company.sectors.map(s => getSectorRisk(s))
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

        {/* Setores */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Setores</h2>
            <Link href={`/empresas/${id}/setores/novo`}>
              <Button size="sm" variant="secondary">+ Novo Setor</Button>
            </Link>
          </div>

          {company.sectors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
              <p className="text-sm text-gray-400">Nenhum setor cadastrado.</p>
              <Link href={`/empresas/${id}/setores/novo`}>
                <Button size="sm" className="mt-3">Cadastrar setor</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {company.sectors.map((sector, i) => {
                const risk = sectorRisks[i]
                const lastAssessment = sector.assessments.at(-1)
                return (
                  <div
                    key={sector.id}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    {/* Header do card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{sector.name}</p>
                        <p className="text-xs text-gray-400">
                          {sector.employee_count} funcionário{sector.employee_count !== 1 ? 's' : ''}
                          {' · '}
                          {sector.assessments.length} avaliação{sector.assessments.length !== 1 ? 'ões' : ''}
                        </p>
                      </div>
                      {risk && <RiskBadge level={risk} />}
                    </div>

                    {/* Última avaliação */}
                    {lastAssessment && (
                      <p className="text-xs text-gray-400">
                        Último ciclo: #{lastAssessment.cycle} em {formatDate(lastAssessment.created_at)}
                      </p>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 border-t border-gray-100 pt-3">
                      <Link
                        href={`/empresas/${id}/setores/${sector.id}/avaliacao/nova`}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full justify-center">
                          Iniciar Avaliação
                        </Button>
                      </Link>
                      <Link href={`/empresas/${id}/setores/${sector.id}/editar`}>
                        <Button size="sm" variant="secondary">Editar</Button>
                      </Link>
                      {sector.assessments.length > 0 && (
                        <Link href={`/empresas/${id}/setores/${sector.id}/historico`}>
                          <Button size="sm" variant="secondary">Histórico</Button>
                        </Link>
                      )}
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
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Histórico de Avaliações
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Clique em uma avaliação para acessar as etapas disponíveis.
            </p>
            <HistoricoTable
              companyId={id}
              rows={company.sectors.flatMap(s =>
                s.assessments.map(a => ({
                  id: a.id,
                  sectorId: s.id,
                  sectorName: s.name,
                  cycle: a.cycle,
                  status: a.status,
                  created_at: a.created_at,
                  actionPlan: (() => {
                    const ap = a.action_plans
                    if (!ap) return null
                    if (Array.isArray(ap)) return (ap as { id: string; status: string }[])[0] ?? null
                    return ap as { id: string; status: string }
                  })(),
                } satisfies AssessmentRow))
              ).sort((a, b) =>
                new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
              )}
            />
          </div>
        )}
      </div>
    </>
  )
}
