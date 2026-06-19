'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { CycleData } from './page'
import type { RiskLevel } from '@/types/database'

interface Factor {
  id: string
  name: string
  dimension: string
}

interface Props {
  cycles: CycleData[]
  factors: Factor[]
  companyId: string
  sectorId: string
  latestAssessmentId: string
  lastAssessmentDate: string | null
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  baixo: '#16a34a',
  moderado: '#ca8a04',
  alto: '#ea580c',
  critico: '#dc2626',
}

const LEVEL_BG: Record<RiskLevel, string> = {
  baixo: 'bg-green-100 text-green-800',
  moderado: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-orange-100 text-orange-800',
  critico: 'bg-red-100 text-red-800',
}

const LINE_PALETTE = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
  '#eab308',
]

type Tab = 'grafico' | 'tabela' | 'delta'

function ReavaliacaoAlert({ lastDate, companyId, sectorId }: { lastDate: string | null; companyId: string; sectorId: string }) {
  if (!lastDate) return null
  const monthsAgo = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (monthsAgo < 6) return null
  const months = Math.floor(monthsAgo)
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-amber-900">Reavaliação recomendada</p>
          <p className="mt-0.5 text-sm text-amber-700">
            A última avaliação foi realizada há <strong>{months} meses</strong>.
            A NR-1 recomenda ciclos de avaliação a cada 6 meses.
          </p>
        </div>
        <a
          href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/nova`}
          className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Iniciar Reavaliação →
        </a>
      </div>
    </div>
  )
}

export function HistoricoClient({ cycles, factors, companyId, sectorId, latestAssessmentId, lastAssessmentDate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('grafico')
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set(factors.map(f => f.id)))

  // Dados para o gráfico: uma linha por fator, um ponto por ciclo
  const chartData = cycles.map(c => {
    const row: Record<string, number | string> = { cycle: `Ciclo ${c.cycle}` }
    for (const s of c.scores) {
      row[s.factorId] = Math.round(s.score)
    }
    return row
  })

  // Delta: comparação entre último e penúltimo ciclo
  const lastCycle = cycles[cycles.length - 1]
  const prevCycle = cycles.length >= 2 ? cycles[cycles.length - 2] : null

  function toggleFactor(factorId: string) {
    setSelectedFactors(prev => {
      const next = new Set(prev)
      if (next.has(factorId)) next.delete(factorId)
      else next.add(factorId)
      return next
    })
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'grafico', label: 'Evolução por Ciclo' },
    { id: 'tabela', label: 'Tabela Comparativa' },
    { id: 'delta', label: 'Variação' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Alerta de reavaliação */}
      <ReavaliacaoAlert lastDate={lastAssessmentDate} companyId={companyId} sectorId={sectorId} />

      {/* Cards resumo por ciclo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cycles.map(c => (
          <a
            key={c.assessmentId}
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${c.assessmentId}/resultado`}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Ciclo #{c.cycle}
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{c.overallScore}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BG[c.worstLevel]}`}>
              {c.worstLevel}
            </span>
            <p className="mt-2 text-xs text-gray-400">
              Modo {c.mode} ·{' '}
              {new Date(c.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </p>
          </a>
        ))}
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Tab: Gráfico */}
          {activeTab === 'grafico' && (
            <div>
              {/* Seletor de fatores */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedFactors(new Set(factors.map(f => f.id)))}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedFactors(new Set())}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  Nenhum
                </button>
                {factors.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFactor(f.id)}
                    title={f.name}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedFactors.has(f.id)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                    style={selectedFactors.has(f.id) ? { backgroundColor: LINE_PALETTE[i % LINE_PALETTE.length] } : undefined}
                  >
                    {f.id}
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="cycle" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
                  <Tooltip
                    formatter={(value, name) => {
                      const factor = factors.find(f => f.id === name)
                      return [`${value}/100`, factor?.name ?? name]
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <ReferenceLine y={25} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Baixo', position: 'right', fontSize: 10, fill: '#16a34a' }} />
                  <ReferenceLine y={50} stroke="#ca8a04" strokeDasharray="4 2" label={{ value: 'Moderado', position: 'right', fontSize: 10, fill: '#ca8a04' }} />
                  <ReferenceLine y={75} stroke="#ea580c" strokeDasharray="4 2" label={{ value: 'Alto', position: 'right', fontSize: 10, fill: '#ea580c' }} />
                  {factors.map((f, i) =>
                    selectedFactors.has(f.id) ? (
                      <Line
                        key={f.id}
                        type="monotone"
                        dataKey={f.id}
                        stroke={LINE_PALETTE[i % LINE_PALETTE.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name={f.id}
                      />
                    ) : null,
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tab: Tabela */}
          {activeTab === 'tabela' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">Fator</th>
                    {cycles.map(c => (
                      <th key={c.cycle} className="px-3 py-2 text-center font-medium">
                        C#{c.cycle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map(f => (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800">
                        <span className="mr-1 font-mono text-xs text-gray-400">{f.id}</span>
                        <span className="text-xs">{f.name}</span>
                      </td>
                      {cycles.map(c => {
                        const score = c.scores.find(s => s.factorId === f.id)
                        if (!score) return <td key={c.cycle} className="px-3 py-2 text-center text-gray-300 text-xs">—</td>
                        return (
                          <td key={c.cycle} className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BG[score.level]}`}>
                              {Math.round(score.score)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* Linha geral */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-xs text-gray-700">Score Geral</td>
                    {cycles.map(c => (
                      <td key={c.cycle} className="px-3 py-2 text-center">
                        <span className="text-sm font-bold text-gray-900">{c.overallScore}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Delta */}
          {activeTab === 'delta' && (
            <div>
              {!prevCycle ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  São necessários ao menos 2 ciclos para comparar variações.
                </p>
              ) : (
                <div>
                  <p className="mb-4 text-sm text-gray-500">
                    Comparando Ciclo #{prevCycle.cycle} → Ciclo #{lastCycle.cycle}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                          <th className="px-3 py-2 text-left font-medium">Fator</th>
                          <th className="px-3 py-2 text-center font-medium">Ciclo #{prevCycle.cycle}</th>
                          <th className="px-3 py-2 text-center font-medium">Ciclo #{lastCycle.cycle}</th>
                          <th className="px-3 py-2 text-center font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factors.map(f => {
                          const prev = prevCycle.scores.find(s => s.factorId === f.id)
                          const curr = lastCycle.scores.find(s => s.factorId === f.id)
                          if (!prev || !curr) return null
                          const delta = Math.round(curr.score) - Math.round(prev.score)
                          return (
                            <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-700">
                                <span className="font-mono text-gray-400 mr-1">{f.id}</span>
                                {f.name}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BG[prev.level]}`}>
                                  {Math.round(prev.score)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BG[curr.level]}`}>
                                  {Math.round(curr.score)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                                  delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : 'text-gray-400'
                                }`}>
                                  {delta < 0 ? '↓' : delta > 0 ? '↑' : '—'}
                                  {delta !== 0 && Math.abs(delta)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        {/* Linha geral */}
                        {(() => {
                          const delta = lastCycle.overallScore - prevCycle.overallScore
                          return (
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                              <td className="px-3 py-2 text-xs text-gray-700">Score Geral</td>
                              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                                {prevCycle.overallScore}
                              </td>
                              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                                {lastCycle.overallScore}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                                  delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : 'text-gray-400'
                                }`}>
                                  {delta < 0 ? '↓' : delta > 0 ? '↑' : '—'}
                                  {delta !== 0 && Math.abs(delta)}
                                </span>
                              </td>
                            </tr>
                          )
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 italic">
                    ↓ Redução do score = melhora. ↑ Aumento = piora.
                    Score mede intensidade do fator de risco (0–100).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <a
          href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${latestAssessmentId}/acompanhamento`}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Acompanhamento
        </a>
        <a
          href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/nova`}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Iniciar Nova Avaliação →
        </a>
      </div>
    </div>
  )
}
