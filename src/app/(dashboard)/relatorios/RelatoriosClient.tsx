'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { RiskBadge } from '@/components/features/RiskBadge'
import type { AssessmentRow } from './page'
import type { RiskLevel } from '@/types/database'

const LEVEL_COLOR: Record<RiskLevel, string> = {
  baixo: '#16a34a',
  moderado: '#ca8a04',
  alto: '#ea580c',
  critico: '#dc2626',
}

interface Props { rows: AssessmentRow[] }

export function RelatoriosClient({ rows }: Props) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'todos'>('todos')
  const [filterCompany, setFilterCompany] = useState('todos')

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach(r => map.set(r.companyId, r.companyName))
    return Array.from(map.entries())
  }, [rows])

  // Dados para o gráfico: média por empresa
  const chartData = useMemo(() => {
    const byCompany = new Map<string, { name: string; total: number; count: number; worst: RiskLevel }>()
    rows.forEach(r => {
      const existing = byCompany.get(r.companyId)
      if (!existing) {
        byCompany.set(r.companyId, { name: r.companyName, total: r.overallScore, count: 1, worst: r.worstLevel })
      } else {
        const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }
        byCompany.set(r.companyId, {
          ...existing,
          total: existing.total + r.overallScore,
          count: existing.count + 1,
          worst: (RISK_ORDER[r.worstLevel] ?? 0) > (RISK_ORDER[existing.worst] ?? 0) ? r.worstLevel : existing.worst,
        })
      }
    })
    return Array.from(byCompany.values()).map(c => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
      score: Math.round(c.total / c.count),
      level: c.worst,
    }))
  }, [rows])

  const filtered = rows.filter(r => {
    const matchSearch =
      search === '' ||
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      r.sectorName.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel === 'todos' || r.worstLevel === filterLevel
    const matchCompany = filterCompany === 'todos' || r.companyId === filterCompany
    return matchSearch && matchLevel && matchCompany
  })

  return (
    <div className="space-y-6">
      {/* Gráfico de scores por empresa */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Score Médio por Empresa</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [`${value}/100`, 'Score médio']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine y={25} stroke="#16a34a" strokeDasharray="3 2" />
              <ReferenceLine y={50} stroke="#ca8a04" strokeDasharray="3 2" />
              <ReferenceLine y={75} stroke="#ea580c" strokeDasharray="3 2" />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={LEVEL_COLOR[entry.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar empresa ou setor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="todos">Todas as empresas</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value as RiskLevel | 'todos')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="todos">Todos os níveis</option>
          <option value="critico">Crítico</option>
          <option value="alto">Alto</option>
          <option value="moderado">Moderado</option>
          <option value="baixo">Baixo</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} avaliação(ões)</span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Setor</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Ciclo</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Modo</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Nível</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Críticos</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Data</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Exportar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-400">
                    Nenhuma avaliação encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.sectorName}</td>
                    <td className="px-4 py-3 text-center text-gray-600">#{row.cycle}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Modo {row.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums text-gray-900">
                      {row.overallScore}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RiskBadge level={row.worstLevel} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.criticalCount > 0 ? (
                        <span className="font-bold text-red-600">{row.criticalCount}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 tabular-nums">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`/empresas/${row.companyId}/setores/${row.sectorId}/avaliacao/${row.id}/resultado`}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                          title="Ver resultado"
                        >
                          Ver
                        </a>
                        <a
                          href={`/api/export/pptx?assessmentId=${row.id}`}
                          download
                          className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                          title="Baixar PPTX"
                        >
                          PPTX
                        </a>
                        <a
                          href={`/api/export/docx?assessmentId=${row.id}`}
                          download
                          className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200"
                          title="Baixar DOCX"
                        >
                          DOCX
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
