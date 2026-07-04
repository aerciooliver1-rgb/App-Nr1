'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { RiskBadge } from '@/components/features/RiskBadge'
import type { AssessmentRow } from './page'
import type { RiskLevel } from '@/types/database'

interface Props { rows: AssessmentRow[] }

export function RelatoriosClient({ rows }: Props) {
  const [search, setSearch]           = useState('')
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'todos'>('todos')
  const [filterCompany, setFilterCompany] = useState('todos')

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach(r => map.set(r.companyId, r.companyName))
    return Array.from(map.entries())
  }, [rows])

  const filtered = rows.filter(r => {
    const matchSearch =
      search === '' ||
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      r.sectorName.toLowerCase().includes(search.toLowerCase())
    const matchLevel   = filterLevel   === 'todos' || r.worstLevel  === filterLevel
    const matchCompany = filterCompany === 'todos' || r.companyId   === filterCompany
    return matchSearch && matchLevel && matchCompany
  })

  return (
    <div className="space-y-5">

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
            <circle cx="6.5" cy="6.5" r="4" />
            <path d="M11 11l2.5 2.5" />
          </svg>
          <input
            type="text"
            placeholder="Buscar empresa ou setor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>

        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        >
          <option value="todos">Todas as empresas</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value as RiskLevel | 'todos')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        >
          <option value="todos">Todos os níveis</option>
          <option value="critico">Crítico</option>
          <option value="alto">Alto</option>
          <option value="moderado">Moderado</option>
          <option value="baixo">Baixo</option>
        </select>

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} avaliação{filtered.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Empresa
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Setor
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Ciclo
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Modo
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Respostas
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Score
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Nível
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Críticos
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Data
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-sm text-gray-400">
                    Nenhuma avaliação encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/relatorios/empresa/${row.companyId}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {row.companyName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{row.sectorName}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500">#{row.cycle}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                        {row.mode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-xs font-semibold tabular-nums text-gray-700 whitespace-nowrap">
                        {row.respostasLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-base font-bold tabular-nums text-gray-900">
                        {row.overallScore}
                      </span>
                      <span className="text-xs text-gray-300">/100</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <RiskBadge level={row.worstLevel} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.criticalCount > 0 ? (
                        <span className="font-bold text-red-600">{row.criticalCount}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs tabular-nums text-gray-400">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/relatorios/empresa/${row.companyId}`}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Ver
                        </Link>
                        <a
                          href={`/api/export/pptx?assessmentId=${row.id}`}
                          download
                          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          PPTX
                        </a>
                        <a
                          href={`/api/export/pdf?assessmentId=${row.id}`}
                          download
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
