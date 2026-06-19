'use client'

import { useState } from 'react'
import { KanbanBoard } from './KanbanBoard'
import { RiskBadge } from '@/components/features/RiskBadge'
import { updateActionStatus } from '@/app/actions/tracking'
import type { KanbanAction } from './page'
import type { ActionStatus } from '@/types/database'

type View = 'kanban' | 'lista'

const STATUS_LABELS: Record<ActionStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
}

const STATUS_COLORS: Record<ActionStatus, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
  atrasada: 'bg-red-100 text-red-800',
}

const RISK_ORDER: Record<string, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

// ─── Visão em lista ───────────────────────────────────────────────────────────

function ListView({
  actions,
  assessmentId,
  companyId,
  sectorId,
  planId,
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
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <th className="px-4 py-3 text-left font-medium">Ação</th>
            <th className="px-4 py-3 text-left font-medium">Responsável</th>
            <th className="px-4 py-3 text-center font-medium">Prazo</th>
            <th className="px-4 py-3 text-center font-medium">Risco</th>
            <th className="px-4 py-3 text-center font-medium">Tipo</th>
            <th className="px-4 py-3 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm text-gray-400">Sem ações.</td>
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
                  <td className="px-4 py-3 text-gray-600">{action.responsible || '—'}</td>
                  <td className={`px-4 py-3 text-center text-xs font-medium tabular-nums ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                    {isOverdue && '⚠ '}
                    {action.due_date
                      ? new Date(action.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {action.risk_level ? <RiskBadge level={action.risk_level} /> : '—'}
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

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle de visão */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {([['kanban', '⊞ Kanban'], ['lista', '☰ Lista']] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
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
