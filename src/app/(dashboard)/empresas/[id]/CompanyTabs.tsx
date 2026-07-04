'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  PieChart, Pie,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/features/RiskBadge'
import type { RiskLevel } from '@/types'

const RISK_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

// ── Tipos de dados (serializáveis, vindos do server component) ────────────────

export interface SectorScoreBar {
  sectorId: string
  name: string
  score: number
  level: RiskLevel
}

export interface StatusData {
  overallScore: number
  overallLevel: RiskLevel
  donut: { name: string; value: number; color: string }[]
  bars: SectorScoreBar[]
  evaluatedSectors: number
  totalSectors: number
}

export interface SectorCardData {
  id: string
  name: string
  employeeCount: number
  managerName: string | null
  assessmentCount: number
  lastCycle: number | null
  lastDate: string | null
  risk: RiskLevel | null
}

export interface AvaliacaoRow {
  id: string
  sectorId: string
  sectorName: string
  cycle: number
  mode: string
  status: string
  date: string | null
  score: number | null
  level: RiskLevel | null
}

interface Props {
  companyId: string
  status: StatusData
  sectors: SectorCardData[]
  avaliacoes: AvaliacaoRow[]
}

// ── Gráfico: Score por Setor (0–100) ──────────────────────────────────────────

function SectorTooltip({ active, payload }: { active?: boolean; payload?: { payload: SectorScoreBar }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-md">
      <p className="mb-1 font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-600">Score: <strong>{d.score}</strong></p>
      <p className="capitalize" style={{ color: RISK_COLORS[d.level] }}>Nível: {d.level}</p>
    </div>
  )
}

function SectorScoreChart({ data }: { data: SectorScoreBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 52, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-28}
          textAnchor="end"
          height={70}
          tickFormatter={(name: string) => name.length > 18 ? name.slice(0, 17) + '…' : name}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickCount={5}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<SectorTooltip />} cursor={{ fill: '#f8fafc' }} />

        <ReferenceLine y={25} stroke="#eab308" strokeDasharray="4 2"
          label={{ value: 'Mod.', position: 'right', fontSize: 10, fill: '#eab308' }} />
        <ReferenceLine y={50} stroke="#f97316" strokeDasharray="4 2"
          label={{ value: 'Alto', position: 'right', fontSize: 10, fill: '#f97316' }} />
        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 2"
          label={{ value: 'Crítico', position: 'right', fontSize: 10, fill: '#ef4444' }} />

        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map(entry => (
            <Cell key={entry.sectorId} fill={RISK_COLORS[entry.level]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Aba: Status Atual ─────────────────────────────────────────────────────────

function StatusTab({ status, companyId }: { status: StatusData; companyId: string }) {
  if (status.bars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <p className="text-sm text-gray-400">
          Nenhuma avaliação calculada ainda. Conclua uma avaliação para ver o status da empresa.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

      {/* Score geral da empresa */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Score Geral
        </p>
        <div className="mt-2 flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-5xl font-bold tabular-nums leading-none text-gray-900">
              {status.overallScore}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">de 100</p>
            <div className="mt-3">
              <RiskBadge level={status.overallLevel} />
            </div>
          </div>
          <div className="relative flex-1">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={status.donut}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={66}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {status.donut.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {status.donut.map(d => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              <span className="text-xs text-gray-500">
                {d.name} <span className="font-semibold text-gray-700">({d.value})</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
          Fatores de risco consolidados da última avaliação de cada setor
          ({status.evaluatedSectors} de {status.totalSectors} setor{status.totalSectors !== 1 ? 'es' : ''} avaliado{status.evaluatedSectors !== 1 ? 's' : ''}).
        </p>
      </div>

      {/* Score por setor */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Score por Setor (0–100)
          </h3>
          <Link
            href={`/relatorios/empresa/${companyId}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Relatório completo →
          </Link>
        </div>
        <SectorScoreChart data={status.bars} />
      </div>
    </div>
  )
}

// ── Aba: Setores ──────────────────────────────────────────────────────────────

function SetoresTab({ sectors, companyId }: { sectors: SectorCardData[]; companyId: string }) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link href={`/empresas/${companyId}/setores/novo`}>
          <Button size="sm" variant="secondary">+ Novo Setor</Button>
        </Link>
      </div>

      {sectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
          <p className="text-sm text-gray-400">Nenhum setor cadastrado.</p>
          <Link href={`/empresas/${companyId}/setores/novo`}>
            <Button size="sm" className="mt-3">Cadastrar setor</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sectors.map(sector => (
            <div
              key={sector.id}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">{sector.name}</p>
                {sector.risk && <RiskBadge level={sector.risk} />}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Colaboradores</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{sector.employeeCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Avaliações</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{sector.assessmentCount}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">Gerente(s) Responsável(is)</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{sector.managerName ?? '—'}</dd>
                </div>
              </dl>

              {sector.lastCycle !== null && (
                <p className="text-xs text-gray-400">
                  Último ciclo: #{sector.lastCycle}{sector.lastDate ? ` em ${sector.lastDate}` : ''}
                </p>
              )}

              <div className="flex gap-2 border-t border-gray-100 pt-3">
                {sector.assessmentCount > 0 && (
                  <Link
                    href={`/empresas/${companyId}/setores/${sector.id}/historico`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full justify-center">
                      Ver Diagnóstico
                    </Button>
                  </Link>
                )}
                <Link
                  href={`/empresas/${companyId}/setores/${sector.id}/avaliacao/nova`}
                  className={sector.assessmentCount === 0 ? 'flex-1' : ''}
                >
                  <Button
                    size="sm"
                    variant={sector.assessmentCount > 0 ? 'secondary' : 'primary'}
                    className={sector.assessmentCount === 0 ? 'w-full justify-center' : ''}
                  >
                    Iniciar Avaliação
                  </Button>
                </Link>
                <Link href={`/empresas/${companyId}/setores/${sector.id}/editar`}>
                  <Button size="sm" variant="secondary">Editar</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Aba: Avaliações ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  rascunho:  'Rascunho',
  em_coleta: 'Em coleta',
  concluido: 'Concluído',
  calculado: 'Calculado',
}

const STATUS_BADGE: Record<string, string> = {
  rascunho:  'bg-gray-100 text-gray-600',
  em_coleta: 'bg-blue-50 text-blue-700',
  concluido: 'bg-violet-50 text-violet-700',
  calculado: 'bg-green-50 text-green-700',
}

function AvaliacoesTab({ avaliacoes, companyId }: { avaliacoes: AvaliacaoRow[]; companyId: string }) {
  if (avaliacoes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <p className="text-sm text-gray-400">Nenhuma avaliação realizada.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Setor</th>
            <th className="px-4 py-3">Ciclo</th>
            <th className="px-4 py-3">Modo</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Score Geral</th>
            <th className="px-4 py-3">Nível</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {avaliacoes.map(a => (
            <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              <td className="px-4 py-3 text-gray-700">{a.date ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{a.sectorName}</td>
              <td className="px-4 py-3 text-gray-700">#{a.cycle}</td>
              <td className="px-4 py-3 text-gray-700">Modo {a.mode}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">
                {a.score !== null ? a.score : '—'}
              </td>
              <td className="px-4 py-3">
                {a.level ? <RiskBadge level={a.level} /> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right">
                {a.status === 'calculado' && (
                  <Link
                    href={`/empresas/${companyId}/setores/${a.sectorId}/avaliacao/${a.id}/resultado`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Ver Resultado →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Componente principal com as abas ──────────────────────────────────────────

const TABS = ['Status Atual', 'Setores', 'Avaliações'] as const
type Tab = typeof TABS[number]

export function CompanyTabs({ companyId, status, sectors, avaliacoes }: Props) {
  const [active, setActive] = useState<Tab>('Status Atual')

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-gray-200" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 'Status Atual' && <StatusTab status={status} companyId={companyId} />}
      {active === 'Setores' && <SetoresTab sectors={sectors} companyId={companyId} />}
      {active === 'Avaliações' && <AvaliacoesTab avaliacoes={avaliacoes} companyId={companyId} />}
    </div>
  )
}
