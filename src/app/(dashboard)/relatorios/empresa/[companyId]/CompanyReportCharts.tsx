'use client'

import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { RiskBadge } from '@/components/features/RiskBadge'
import type { RiskLevel } from '@/types'

export interface AssessmentCardData {
  assessmentId: string
  sectorId: string
  companyId: string
  sectorName: string
  cycle: number
  mode: string
  date: string
  overallScore: number
  overallLevel: RiskLevel
  pieData: { name: string; value: number; color: string }[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{payload[0].value} fator{payload[0].value !== 1 ? 'es' : ''}</p>
    </div>
  )
}

function AssessmentCard({ data }: { data: AssessmentCardData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <Link
          href={`/empresas/${data.companyId}/setores/${data.sectorId}/avaliacao/${data.assessmentId}/resultado`}
          className="group inline-block"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 group-hover:text-blue-600 transition-colors">
            {data.sectorName}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 group-hover:text-blue-500 transition-colors underline-offset-2 group-hover:underline">
            Ciclo #{data.cycle} · Modo {data.mode} · {data.date}
          </p>
        </Link>
      </div>

      {/* Score + Donut */}
      <div className="flex items-center gap-4">

        {/* Score esquerda */}
        <div className="shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Score geral
          </p>
          <p className="mt-1 text-5xl font-bold tabular-nums text-gray-900 leading-none">
            {data.overallScore}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">de 100</p>
          <div className="mt-3">
            <RiskBadge level={data.overallLevel} />
          </div>
        </div>

        {/* Donut direita */}
        <div className="relative flex-1">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.pieData}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={72}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {data.pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.pieData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="text-xs text-gray-500">
              {d.name} <span className="font-semibold text-gray-700">({d.value})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Exportar */}
      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
        <a
          href={`/api/export/pptx?assessmentId=${data.assessmentId}`}
          download
          className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="2" y="2" width="8" height="10" rx="1" />
            <path d="M6 2v4h4" />
            <path d="M10 9H6M10 11H6" />
          </svg>
          PPTX
        </a>
        <a
          href={`/api/export/pdf?assessmentId=${data.assessmentId}`}
          download
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="2" y="2" width="8" height="10" rx="1" />
            <path d="M6 2v4h4" />
            <path d="M10 9H6M10 11H6" />
          </svg>
          PDF
        </a>
      </div>
    </div>
  )
}

export function CompanyReportCharts({ assessments }: { assessments: AssessmentCardData[] }) {
  if (assessments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <p className="text-sm text-gray-400">Nenhuma avaliação concluída para esta empresa.</p>
      </div>
    )
  }

  return (
    <div className={`grid gap-5 ${assessments.length === 1 ? 'max-w-md grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {assessments.map(a => (
        <AssessmentCard key={a.assessmentId} data={a} />
      ))}
    </div>
  )
}
