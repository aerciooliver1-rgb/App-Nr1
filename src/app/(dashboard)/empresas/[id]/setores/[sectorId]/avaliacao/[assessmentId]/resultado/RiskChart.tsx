'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { RiskLevel } from '@/types'

const RISK_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

interface DataPoint {
  factorId: string
  name: string
  fullName: string
  score: number
  level: RiskLevel
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DataPoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-md">
      <p className="mb-1 font-semibold text-gray-800">{d.fullName}</p>
      <p className="text-gray-600">Score: <strong>{d.score.toFixed(1)}</strong></p>
      <p className="capitalize" style={{ color: RISK_COLORS[d.level] }}>Nível: {d.level}</p>
    </div>
  )
}

export function RiskChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 52, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickCount={5}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

        <ReferenceLine y={25} stroke="#eab308" strokeDasharray="4 2"
          label={{ value: 'Mod.', position: 'right', fontSize: 10, fill: '#eab308' }} />
        <ReferenceLine y={50} stroke="#f97316" strokeDasharray="4 2"
          label={{ value: 'Alto', position: 'right', fontSize: 10, fill: '#f97316' }} />
        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 2"
          label={{ value: 'Crítico', position: 'right', fontSize: 10, fill: '#ef4444' }} />

        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map(entry => (
            <Cell key={entry.factorId} fill={RISK_COLORS[entry.level]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
