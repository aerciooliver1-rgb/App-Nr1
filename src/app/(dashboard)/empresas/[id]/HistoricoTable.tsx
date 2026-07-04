'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export interface AssessmentRow {
  id: string
  sectorId: string
  sectorName: string
  cycle: number
  status: string
  created_at: string | null
  actionPlan: { id: string; status: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  rascunho:   'Rascunho',
  em_coleta:  'Em Coleta',
  concluido:  'Concluído',
  calculado:  'Calculado',
}

const STATUS_CLASS: Record<string, string> = {
  rascunho:  'bg-gray-100 text-gray-500',
  em_coleta: 'bg-blue-50 text-blue-600',
  concluido: 'bg-amber-50 text-amber-700',
  calculado: 'bg-emerald-50 text-emerald-700',
}

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

function ChevronRight({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

interface StepButtonProps {
  icon: React.ReactNode
  label: string
  active: boolean
  href: string
  sublabel?: string
}

function StepButton({ icon, label, active, href, sublabel }: StepButtonProps) {
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

export function HistoricoTable({
  rows,
  companyId,
}: {
  rows: AssessmentRow[]
  companyId: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide w-5" />
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Setor</th>
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Ciclo</th>
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Data</th>
            <th className="px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Plano</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => {
            const isOpen = openId === row.id
            const isCalc = row.status === 'calculado'
            const hasPlan = row.actionPlan !== null
            const planFinal = row.actionPlan?.status === 'finalizado'

            const base = `/empresas/${companyId}/setores/${row.sectorId}/avaliacao/${row.id}`

            return [
              <tr
                key={row.id}
                onClick={() => setOpenId(isOpen ? null : row.id)}
                className={`cursor-pointer transition-colors ${
                  isOpen ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Chevron */}
                <td className="px-3 py-3.5">
                  <ChevronRight open={isOpen} />
                </td>
                <td className="px-4 py-3.5 font-medium text-gray-700">{row.sectorName}</td>
                <td className="px-4 py-3.5 text-gray-400">#{row.cycle}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_CLASS[row.status] ?? 'bg-gray-100 text-gray-500'
                  }`}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-400">
                  {row.created_at ? formatDate(row.created_at) : '—'}
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-400">
                  {hasPlan ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      planFinal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {planFinal ? 'Finalizado' : 'Em andamento'}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>,

              /* Submenu expansível */
              isOpen && (
                <tr key={`${row.id}-sub`} className="bg-blue-50/60">
                  <td colSpan={6} className="px-5 py-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                      Navegar para
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <StepButton
                        icon={<IconResultado />}
                        label="Resultado"
                        active={isCalc}
                        href={`${base}/resultado`}
                        sublabel={isCalc ? undefined : 'Aguardando cálculo'}
                      />
                      <StepButton
                        icon={<IconIntervencoes />}
                        label="Intervenções"
                        active={isCalc}
                        href={`${base}/intervencoes`}
                        sublabel={isCalc ? undefined : 'Requer resultado'}
                      />
                      <StepButton
                        icon={<IconPlano />}
                        label="Plano de Ação"
                        active={hasPlan}
                        href={`${base}/plano`}
                        sublabel={hasPlan ? undefined : 'Requer intervenções'}
                      />
                      <StepButton
                        icon={<IconApresentacao />}
                        label="Apresentação"
                        active={planFinal}
                        href={`${base}/apresentacao`}
                        sublabel={planFinal ? undefined : 'Requer plano finalizado'}
                      />
                      <StepButton
                        icon={<IconAcompanhamento />}
                        label="Acompanhamento"
                        active={hasPlan}
                        href={`${base}/acompanhamento`}
                        sublabel={hasPlan ? undefined : 'Requer plano de ação'}
                      />
                    </div>
                  </td>
                </tr>
              ),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
