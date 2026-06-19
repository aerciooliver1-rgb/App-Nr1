'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
} from 'recharts'
import type { RiskLevel } from '@/types'

const RISK_COLORS: Record<RiskLevel, string> = {
  baixo: '#22c55e',
  moderado: '#eab308',
  alto: '#f97316',
  critico: '#ef4444',
}

interface DataPoint {
  factorId: string
  name: string
  fullName: string
  score: number
  level: RiskLevel
}

interface Props {
  data: DataPoint[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DataPoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.fullName}</p>
      <p className="text-gray-600">Score: <strong>{d.score.toFixed(1)}</strong></p>
      <p className="capitalize" style={{ color: RISK_COLORS[d.level] }}>Nível: {d.level}</p>
    </div>
  )
}

export function RiskChart({ data }: Props) {
  const [view, setView] = useState<'bar' | 'radar'>('bar')

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setView('bar')}
            className={`px-3 py-1.5 ${view === 'bar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Barras
          </button>
          <button
            onClick={() => setView('radar')}
            className={`px-3 py-1.5 border-l border-gray-200 ${view === 'radar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Radar
          </button>
        </div>
      </div>

      {view === 'bar' && (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 70, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickCount={6} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map(entry => (
                <Cell key={entry.factorId} fill={RISK_COLORS[entry.level]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {view === 'radar' && (
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.25}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Legenda */}
      <div className="mt-4 flex gap-4 justify-center flex-wrap text-xs">
        {(['baixo', 'moderado', 'alto', 'critico'] as RiskLevel[]).map(level => (
          <div key={level} className="flex items-center gap-1.5 capitalize">
            <span className="h-3 w-3 rounded-sm" style={{ background: RISK_COLORS[level] }} />
            {level} {level === 'baixo' ? '(0–25)' : level === 'moderado' ? '(26–50)' : level === 'alto' ? '(51–75)' : '(76–100)'}
          </div>
        ))}
      </div>
    </div>
  )
}
