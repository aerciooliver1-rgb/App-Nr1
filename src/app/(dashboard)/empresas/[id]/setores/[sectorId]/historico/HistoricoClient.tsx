'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
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

const LEVEL_BG: Record<RiskLevel, string> = {
  baixo:    'bg-green-100 text-green-800',
  moderado: 'bg-yellow-100 text-yellow-800',
  alto:     'bg-orange-100 text-orange-800',
  critico:  'bg-red-100 text-red-800',
}

// Uma cor por ciclo
const CYCLE_COLORS = [
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#06b6d4', // ciano
  '#f59e0b', // âmbar
  '#10b981', // esmeralda
]

type Tab = 'grafico' | 'tabela' | 'delta'

function ReavaliacaoAlert({
  lastDate,
  companyId,
  sectorId,
}: {
  lastDate: string | null
  companyId: string
  sectorId: string
}) {
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

// ── Tooltip customizado ────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  factors,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  factors: Factor[]
}) {
  if (!active || !payload?.length) return null
  const factor = factors.find(f => f.id === label)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-gray-700">
        {label} — {factor?.name ?? label}
      </p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-900">{p.value}/100</span>
        </div>
      ))}
    </div>
  )
}

// ── Painel de métricas de evolução ─────────────────────────────────────────────

function EvolucaoStats({ cycles, factors }: { cycles: CycleData[]; factors: Factor[] }) {
  if (cycles.length < 2) return null

  const first = cycles[0]
  const last  = cycles[cycles.length - 1]

  // Duração total em meses
  const msFirst    = new Date(first.createdAt).getTime()
  const msLast     = new Date(last.createdAt).getTime()
  const months     = Math.max(1, Math.round((msLast - msFirst) / (1000 * 60 * 60 * 24 * 30)))

  // Score geral
  const scoreDelta   = last.overallScore - first.overallScore
  const scoreImproved = scoreDelta < 0

  // Fatores melhorados (score menor = risco menor = melhora)
  let improvedCount = 0
  let comparableCount = 0
  for (const f of factors) {
    const prev = first.scores.find(s => s.factorId === f.id)
    const curr = last.scores.find(s => s.factorId === f.id)
    if (prev && curr) {
      comparableCount++
      if (curr.score < prev.score) improvedCount++
    }
  }

  const firstLabel = new Date(first.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  const lastLabel  = new Date(last.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

  return (
    <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      {/* Score geral */}
      <div className="px-5 py-4 text-center">
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {first.overallScore}
          <span className="mx-1.5 text-base font-normal text-gray-300">→</span>
          {last.overallScore}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Score Geral
        </p>
        <p className={`mt-1 text-xs font-semibold ${scoreImproved ? 'text-emerald-600' : scoreDelta > 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {scoreImproved ? '↓' : scoreDelta > 0 ? '↑' : '—'}
          {scoreDelta !== 0 && ` ${Math.abs(scoreDelta)} pts`}
          {scoreImproved ? ' (melhora)' : scoreDelta > 0 ? ' (piora)' : ' (sem variação)'}
        </p>
      </div>

      {/* Duração */}
      <div className="px-5 py-4 text-center">
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {months}{' '}
          <span className="text-base font-normal text-gray-500">{months === 1 ? 'mês' : 'meses'}</span>
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Duração entre Ciclos
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Ciclo #{first.cycle} ({firstLabel}) → Ciclo #{last.cycle} ({lastLabel})
        </p>
      </div>

      {/* Fatores melhorados */}
      <div className="px-5 py-4 text-center">
        <p className="text-2xl font-bold tabular-nums text-emerald-700">
          {improvedCount}
          <span className="text-base font-normal text-gray-400">/{comparableCount}</span>
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Fatores Melhorados
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {comparableCount - improvedCount} sem melhora
        </p>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────

export function HistoricoClient({
  cycles,
  factors,
  companyId,
  sectorId,
  latestAssessmentId,
  lastAssessmentDate,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('grafico')
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(
    new Set(factors.map(f => f.id)),
  )

  // Dados para o gráfico de barras: um ponto por fator, uma barra por ciclo
  const barData = factors
    .filter(f => selectedFactors.has(f.id))
    .map(f => {
      const entry: Record<string, string | number> = {
        factorId:   f.id,
        factorName: f.name,
      }
      for (const c of cycles) {
        const score = c.scores.find(s => s.factorId === f.id)
        entry[`Ciclo ${c.cycle}`] = score ? Math.round(score.score) : 0
      }
      return entry
    })

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
    { id: 'tabela',  label: 'Tabela Comparativa' },
    { id: 'delta',   label: 'Variação' },
  ]

  return (
    <div className="flex flex-col gap-6">

      <ReavaliacaoAlert lastDate={lastAssessmentDate} companyId={companyId} sectorId={sectorId} />

      {/* Cards resumo por ciclo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cycles.map(c => (
          <a
            key={c.assessmentId}
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${c.assessmentId}/resultado`}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
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

          {/* ── Tab: Evolução por Ciclo ──────────────────────────────── */}
          {activeTab === 'grafico' && (
            <div>
              {/* Filtro de fatores */}
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
                {factors.map(f => (
                  <button
                    key={f.id}
                    onClick={() => toggleFactor(f.id)}
                    title={f.name}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedFactors.has(f.id)
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {f.id}
                  </button>
                ))}
              </div>

              {/* Legenda de ciclos */}
              <div className="mb-3 flex flex-wrap gap-3">
                {cycles.map((c, i) => (
                  <div key={c.cycle} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: CYCLE_COLORS[i % CYCLE_COLORS.length] }}
                    />
                    Ciclo {c.cycle} · {new Date(c.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                  </div>
                ))}
              </div>

              {/* Gráfico de barras agrupadas — scroll horizontal em telas pequenas */}
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(600, selectedFactors.size * 60) }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={barData}
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      barCategoryGap="25%"
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="factorId" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                      <Tooltip content={<CustomTooltip factors={factors} />} />
                      <ReferenceLine y={25} stroke="#16a34a" strokeDasharray="4 2" strokeOpacity={0.5} />
                      <ReferenceLine y={50} stroke="#ca8a04" strokeDasharray="4 2" strokeOpacity={0.5} />
                      <ReferenceLine y={75} stroke="#ea580c" strokeDasharray="4 2" strokeOpacity={0.5} />
                      {cycles.map((c, i) => (
                        <Bar
                          key={c.cycle}
                          dataKey={`Ciclo ${c.cycle}`}
                          fill={CYCLE_COLORS[i % CYCLE_COLORS.length]}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={24}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legenda das linhas de referência */}
              <div className="mt-2 flex flex-wrap gap-4 justify-end">
                {[
                  { label: 'Baixo ≤25', color: '#16a34a' },
                  { label: 'Moderado ≤50', color: '#ca8a04' },
                  { label: 'Alto ≤75', color: '#ea580c' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="inline-block h-px w-4 border-t border-dashed" style={{ borderColor: r.color }} />
                    {r.label}
                  </div>
                ))}
              </div>

              {/* Painel de métricas de evolução */}
              <EvolucaoStats cycles={cycles} factors={factors} />
            </div>
          )}

          {/* ── Tab: Tabela ─────────────────────────────────────────── */}
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
                        if (!score) return <td key={c.cycle} className="px-3 py-2 text-center text-xs text-gray-300">—</td>
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

          {/* ── Tab: Variação ───────────────────────────────────────── */}
          {activeTab === 'delta' && (
            <div>
              {!prevCycle ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  São necessários ao menos 2 ciclos para comparar variações.
                </p>
              ) : (
                <div>
                  <p className="mb-4 text-sm text-gray-500">
                    Comparando Ciclo #{prevCycle.cycle} → Ciclo #{lastCycle?.cycle}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                          <th className="px-3 py-2 text-left font-medium">Fator</th>
                          <th className="px-3 py-2 text-center font-medium">Ciclo #{prevCycle.cycle}</th>
                          <th className="px-3 py-2 text-center font-medium">Ciclo #{lastCycle?.cycle}</th>
                          <th className="px-3 py-2 text-center font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factors.map(f => {
                          const prev = prevCycle.scores.find(s => s.factorId === f.id)
                          const curr = lastCycle?.scores.find(s => s.factorId === f.id)
                          if (!prev || !curr) return null
                          const delta = Math.round(curr.score) - Math.round(prev.score)
                          return (
                            <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-700">
                                <span className="mr-1 font-mono text-gray-400">{f.id}</span>
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
                                  delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-red-600' : 'text-gray-400'
                                }`}>
                                  {delta < 0 ? '↓' : delta > 0 ? '↑' : '—'}
                                  {delta !== 0 && Math.abs(delta)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        {(() => {
                          const delta = (lastCycle?.overallScore ?? 0) - prevCycle.overallScore
                          return (
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                              <td className="px-3 py-2 text-xs text-gray-700">Score Geral</td>
                              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                                {prevCycle.overallScore}
                              </td>
                              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900">
                                {lastCycle?.overallScore}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                                  delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-red-600' : 'text-gray-400'
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
                  <p className="mt-3 text-xs italic text-gray-400">
                    ↓ Redução do score = melhora. ↑ Aumento = piora. Score mede intensidade do fator de risco (0–100).
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
