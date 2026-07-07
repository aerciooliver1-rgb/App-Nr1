'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CompanyNav, SectorNav } from './page'

// ─── Ícones das etapas ─────────────────────────────────────────────────────────

function IconResultado() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  )
}

function IconIntervencoes() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  )
}

function IconPlano() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 5h6M5 8h6M5 11h3" />
    </svg>
  )
}

function IconApresentacao() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="1" y="2" width="14" height="9" rx="1" />
      <path d="M8 11v3M5 14h6" />
    </svg>
  )
}

function IconAcompanhamento() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2 11l3-4 3 2 3-5 3 3" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 opacity-40">
      <rect x="4" y="7" width="8" height="6" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

// ─── Botão de etapa (com bloqueio) ─────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  rascunho:  'Rascunho',
  em_coleta: 'Em Coleta',
  concluido: 'Concluído',
  calculado: 'Calculado',
}

const STATUS_CLASS: Record<string, string> = {
  rascunho:  'bg-gray-100 text-gray-500',
  em_coleta: 'bg-blue-50 text-blue-600',
  concluido: 'bg-amber-50 text-amber-700',
  calculado: 'bg-emerald-50 text-emerald-700',
}

function StepButton({
  icon,
  label,
  active,
  href,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  href: string
  sublabel?: string
}) {
  const base = 'flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium transition-all min-w-[110px]'
  if (!active) {
    return (
      <div
        title="Esta etapa ainda não foi concluída"
        className={`${base} cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 select-none`}
      >
        <div className="flex items-center gap-1.5">
          <span className="opacity-30">{icon}</span>
          <IconLock />
        </div>
        <span>{label}</span>
        {sublabel && <span className="text-[10px] font-normal text-gray-300">{sublabel}</span>}
      </div>
    )
  }
  return (
    <Link
      href={href}
      className={`${base} border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm`}
    >
      <span className="text-blue-600">{icon}</span>
      <span>{label}</span>
      {sublabel && <span className="text-[10px] font-normal text-blue-500">{sublabel}</span>}
    </Link>
  )
}

// ─── Setor: linha + submenu de etapas ──────────────────────────────────────────

function SectorRow({ sector, companyId }: { sector: SectorNav; companyId: string }) {
  const [open, setOpen] = useState(false)
  const base = sector.assessmentId
    ? `/empresas/${companyId}/setores/${sector.id}/avaliacao/${sector.assessmentId}`
    : null

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          open ? 'bg-blue-50/70' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Chevron open={open} />
          <span className="text-sm font-medium text-gray-800">{sector.name}</span>
          {sector.lastStatus && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[sector.lastStatus] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABEL[sector.lastStatus] ?? sector.lastStatus}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400">
          {sector.lastDate ? `Última avaliação: ${sector.lastDate}` : 'Sem avaliações'}
        </span>
      </button>

      {open && (
        <div className="border-t border-blue-100 bg-blue-50/40 px-5 py-4">
          {!sector.assessmentId ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {sector.coletaId
                  ? 'Coleta em andamento — o resultado aparece aqui após o cálculo.'
                  : 'Este setor ainda não tem avaliação calculada.'}
              </p>
              {sector.coletaId ? (
                <Link
                  href={`/empresas/${companyId}/setores/${sector.id}/avaliacao/${sector.coletaId}/coleta`}
                  className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Abrir Coleta · QR Code →
                </Link>
              ) : (
                <Link
                  href={`/empresas/${companyId}/setores/${sector.id}/avaliacao/nova`}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Iniciar Avaliação →
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  Navegar para · Ciclo #{sector.cycle}
                </p>
                <div className="flex items-center gap-2">
                  {sector.coletaId && (
                    <Link
                      href={`/empresas/${companyId}/setores/${sector.id}/avaliacao/${sector.coletaId}/coleta`}
                      className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Coleta ativa →
                    </Link>
                  )}
                  {sector.exportId && (
                    <>
                      <a
                        href={`/api/export/pptx?assessmentId=${sector.exportId}`}
                        download
                        className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        PPTX
                      </a>
                      <a
                        href={`/api/export/pdf?assessmentId=${sector.exportId}`}
                        download
                        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        PDF
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StepButton
                  icon={<IconResultado />}
                  label="Resultado"
                  active={sector.isCalc}
                  href={`${base}/resultado`}
                  sublabel={sector.isCalc ? undefined : 'Aguardando cálculo'}
                />
                <StepButton
                  icon={<IconIntervencoes />}
                  label="Intervenções"
                  active={sector.isCalc}
                  href={`${base}/intervencoes`}
                  sublabel={sector.isCalc ? undefined : 'Requer resultado'}
                />
                <StepButton
                  icon={<IconPlano />}
                  label="Plano de Ação"
                  active={sector.hasInterventions}
                  href={`${base}/plano`}
                  sublabel={sector.hasInterventions ? undefined : 'Requer intervenções definidas'}
                />
                <StepButton
                  icon={<IconApresentacao />}
                  label="Apresentação"
                  active={sector.hasInterventions && sector.planFinal}
                  href={`${base}/apresentacao`}
                  sublabel={sector.hasInterventions && sector.planFinal ? undefined : 'Requer plano finalizado'}
                />
                <StepButton
                  icon={<IconAcompanhamento />}
                  label="Acompanhamento"
                  active={sector.hasInterventions && sector.planFinal && sector.hasApproval}
                  href={`${base}/acompanhamento`}
                  sublabel={sector.hasInterventions && sector.planFinal && sector.hasApproval ? undefined : 'Requer apresentação concluída'}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Empresa: card + submenu ───────────────────────────────────────────────────

function CompanyCard({ company }: { company: CompanyNav }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors ${
          open ? 'bg-gray-50' : 'hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-3">
          <Chevron open={open} />
          <span>
            <span className="block font-semibold text-gray-900">{company.name}</span>
            {company.cnpj && (
              <span className="mt-0.5 block font-mono text-xs text-gray-400">{company.cnpj}</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-4 text-xs text-gray-400">
          <span>{company.sectorCount} setor{company.sectorCount !== 1 ? 'es' : ''}</span>
          {company.lastGlobalDate && (
            <span className="hidden sm:inline">
              Última avaliação: <span className="font-semibold text-gray-600">{company.lastGlobalDate}</span>
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Última Avaliação Global
              </p>
              <p className="mt-0.5 text-sm font-bold text-gray-800">
                {company.lastGlobalDate ?? '—'}
              </p>
            </div>
            {company.hasCurrentResults ? (
              <Link
                href={`/relatorios/empresa/${company.id}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Relatório Consolidado →
              </Link>
            ) : (
              <span
                title="Disponível quando houver avaliação calculada"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-400"
              >
                <IconLock />
                Relatório Consolidado — aguardando cálculo
              </span>
            )}
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Últimas avaliações por setor
          </p>
          {company.sectors.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">Nenhum setor cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {company.sectors.map(sector => (
                <SectorRow key={sector.id} sector={sector} companyId={company.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RelatoriosClient({ companies }: { companies: CompanyNav[] }) {
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <p className="text-sm text-gray-400">Nenhuma empresa cadastrada.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {companies.map(company => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  )
}
