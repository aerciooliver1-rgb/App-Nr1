'use client'

import { useState } from 'react'
import { KanbanBoard } from './KanbanBoard'
import { RiskBadge } from '@/components/features/RiskBadge'
import { updateActionStatus } from '@/app/actions/tracking'
import type { KanbanAction } from './page'
import type { ActionStatus } from '@/types/database'

type View = 'kanban' | 'lista'

const STATUS_LABELS: Record<ActionStatus, string> = {
  pendente:     'Pendente',
  em_andamento: 'Em Andamento',
  concluida:    'Concluída',
  atrasada:     'Atrasada',
}

const STATUS_COLORS: Record<ActionStatus, string> = {
  pendente:     'bg-gray-100 text-gray-600',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida:    'bg-emerald-100 text-emerald-700',
  atrasada:     'bg-red-100 text-red-700',
}

const STATUS_STAT_COLORS: Record<ActionStatus, string> = {
  pendente:     'text-gray-500',
  em_andamento: 'text-blue-600',
  concluida:    'text-emerald-600',
  atrasada:     'text-red-600',
}

const RISK_ORDER: Record<string, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

function KanbanIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  )
}

// ─── Visão em lista ───────────────────────────────────────────────────────────

function ListView({
  actions,
}: {
  actions: KanbanAction[]
  assessmentId: string
  companyId: string
  sectorId: string
  planId: string
}) {
  const [localActions, setLocalActions] = useState(actions)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const sorted = [...localActions].sort(
    (a, b) => (RISK_ORDER[b.risk_level ?? 'baixo'] ?? 0) - (RISK_ORDER[a.risk_level ?? 'baixo'] ?? 0),
  )

  const today = new Date().toISOString().split('T')[0]

  async function handleStatusChange(actionId: string, newStatus: ActionStatus) {
    const prev = localActions.find(a => a.id === actionId)?.status
    setLocalActions(ls => ls.map(a => a.id === actionId ? { ...a, status: newStatus } : a))
    setUpdatingId(actionId)
    const result = await updateActionStatus(actionId, newStatus)
    if (result.error && prev) {
      setLocalActions(ls => ls.map(a => a.id === actionId ? { ...a, status: prev } : a))
    }
    setUpdatingId(null)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
            <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Ação</th>
            <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Responsável</th>
            <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Prazo</th>
            <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Risco</th>
            <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Tipo</th>
            <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm text-gray-400">Sem ações cadastradas.</td>
            </tr>
          ) : (
            sorted.map(action => {
              const isOverdue = action.due_date && action.due_date < today && action.status !== 'concluida'
              return (
                <tr key={action.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{action.description}</p>
                    {action.factorName && (
                      <p className="text-xs text-gray-400">{action.factorName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{action.responsible || '—'}</td>
                  <td className={`px-4 py-3 text-center text-xs font-medium tabular-nums ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    {isOverdue && <span className="mr-0.5">!</span>}
                    {action.due_date
                      ? new Date(action.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {action.risk_level ? <RiskBadge level={action.risk_level} /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      action.type === 'corretiva' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {action.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={action.status}
                      disabled={updatingId === action.id}
                      onChange={e => handleStatusChange(action.id, e.target.value as ActionStatus)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 ${STATUS_COLORS[action.status]}`}
                    >
                      {(Object.keys(STATUS_LABELS) as ActionStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Container com toggle ─────────────────────────────────────────────────────

interface Props {
  initialActions: KanbanAction[]
  assessmentId: string
  companyId: string
  sectorId: string
  planId: string
}

export function AcompanhamentoClient({ initialActions, assessmentId, companyId, sectorId, planId }: Props) {
  const [view, setView] = useState<View>('kanban')

  const STATUSES: ActionStatus[] = ['pendente', 'em_andamento', 'concluida', 'atrasada']
  const counts = Object.fromEntries(
    STATUSES.map(s => [s, initialActions.filter(a => a.status === s).length])
  ) as Record<ActionStatus, number>

  const pct = initialActions.length > 0
    ? Math.round((counts.concluida / initialActions.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex flex-1 flex-wrap gap-4">
          {STATUSES.map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`text-lg font-bold tabular-nums ${STATUS_STAT_COLORS[s]}`}>
                {counts[s]}
              </span>
              <span className="text-xs text-gray-400">{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">{pct}%</span>
        </div>
      </div>

      {/* Toggle de visão */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {([['kanban', <KanbanIcon key="k" />, 'Kanban'], ['lista', <ListIcon key="l" />, 'Lista']] as [View, React.ReactNode, string][]).map(([v, icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard
          initialActions={initialActions}
          assessmentId={assessmentId}
          companyId={companyId}
          sectorId={sectorId}
          planId={planId}
        />
      ) : (
        <ListView
          actions={initialActions}
          assessmentId={assessmentId}
          companyId={companyId}
          sectorId={sectorId}
          planId={planId}
        />
      )}
    </div>
  )
}
