'use client'

import { useActionState, useState, useTransition, useRef } from 'react'
import { RiskBadge } from '@/components/features/RiskBadge'
import { addAction, updateAction, deleteAction, finalizePlan } from '@/app/actions/plans'
import type { ActionRow } from './page'
import type { RiskLevel } from '@/types/database'

interface Props {
  planId: string
  planStatus: string
  assessmentId: string
  companyId: string
  sectorId: string
  initialActions: ActionRow[]
  factorMap: Record<string, string>
}

export function PlanoClient({
  planId,
  planStatus,
  assessmentId,
  companyId,
  sectorId,
  initialActions,
  factorMap,
}: Props) {
  const [actions, setActions] = useState<ActionRow[]>(initialActions)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [addState, addFormAction] = useActionState(
    async (state: { errors?: Record<string, string[]>; message?: string } | undefined, formData: FormData) => {
      formData.set('plan_id', planId)
      const result = await addAction(state, formData)
      if (!result) {
        // Sucesso — recarrega lista
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('actions')
          .select('id, plan_id, description, responsible, due_date, type, status, factor_id, risk_level')
          .eq('plan_id', planId)
        if (data) setActions(data as ActionRow[])
        setShowAddForm(false)
      }
      return result
    },
    undefined,
  )

  async function handleFieldBlur(
    actionId: string,
    field: 'description' | 'responsible' | 'due_date',
    value: string,
  ) {
    setActions(prev =>
      prev.map(a => (a.id === actionId ? { ...a, [field]: value } : a))
    )
    await updateAction(actionId, { [field]: value })
  }

  async function handleDelete(actionId: string) {
    setDeletingId(actionId)
    const result = await deleteAction(actionId)
    if (!result.error) {
      setActions(prev => prev.filter(a => a.id !== actionId))
    }
    setDeletingId(null)
  }

  function handleFinalize() {
    setFinalizeError(null)
    startTransition(async () => {
      const result = await finalizePlan(planId, companyId, sectorId, assessmentId)
      if (result?.error) setFinalizeError(result.error)
    })
  }

  const isFinalized = planStatus === 'finalizado'

  return (
    <div className="flex flex-col gap-6">
      {/* Header info */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{actions.length} ação(ões) no plano</p>
            {isFinalized && (
              <p className="text-xs text-green-600 font-medium mt-0.5">Plano finalizado</p>
            )}
          </div>
          {!isFinalized && (
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Adicionar ação
            </button>
          )}
        </div>
      </div>

      {/* Formulário nova ação */}
      {showAddForm && (
        <form
          action={addFormAction}
          className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
        >
          <h3 className="mb-3 font-semibold text-gray-900">Nova Ação</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
              <input
                name="description"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Descreva a ação a ser executada"
              />
              {addState?.errors?.description && (
                <p className="text-xs text-red-600">{addState.errors.description[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Responsável *</label>
              <input
                name="responsible"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nome do responsável"
              />
              {addState?.errors?.responsible && (
                <p className="text-xs text-red-600">{addState.errors.responsible[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Prazo *</label>
              <input
                name="due_date"
                type="date"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {addState?.errors?.due_date && (
                <p className="text-xs text-red-600">{addState.errors.due_date[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Tipo</label>
              <select name="type" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
              </select>
            </div>
          </div>
          {addState?.message && (
            <p className="mt-2 text-sm text-red-600">{addState.message}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {/* Lista de ações */}
      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">Nenhuma ação gerada. Adicione manualmente ou volte às intervenções.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              factorName={action.factor_id ? factorMap[action.factor_id] : undefined}
              isFinalized={isFinalized}
              isDeleting={deletingId === action.id}
              onFieldBlur={handleFieldBlur}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Erro + botão finalizar */}
      {finalizeError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{finalizeError}</div>
      )}

      {!isFinalized && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleFinalize}
            disabled={isPending || actions.length === 0}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {isPending ? 'Finalizando…' : 'Finalizar Plano →'}
          </button>
        </div>
      )}

      {isFinalized && (
        <div className="flex justify-end pt-2">
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/apresentacao`}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ir para Apresentação →
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Card de ação individual ─────────────────────────────────────────────────

function ActionCard({
  action,
  factorName,
  isFinalized,
  isDeleting,
  onFieldBlur,
  onDelete,
}: {
  action: ActionRow
  factorName?: string
  isFinalized: boolean
  isDeleting: boolean
  onFieldBlur: (id: string, field: 'description' | 'responsible' | 'due_date', value: string) => void
  onDelete: (id: string) => void
}) {
  const descRef = useRef<HTMLInputElement>(null)
  const respRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${
        isDeleting ? 'opacity-40' : ''
      } ${action.risk_level === 'critico' ? 'border-l-4 border-l-red-500' : action.risk_level === 'alto' ? 'border-l-4 border-l-orange-400' : 'border-gray-200'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {action.risk_level && <RiskBadge level={action.risk_level} />}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            action.type === 'corretiva'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {action.type}
          </span>
          {factorName && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]">{factorName}</span>
          )}
        </div>
        {!isFinalized && (
          <button
            onClick={() => onDelete(action.id)}
            disabled={isDeleting}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-gray-500">Descrição</label>
          <input
            ref={descRef}
            defaultValue={action.description}
            disabled={isFinalized}
            onBlur={e => onFieldBlur(action.id, 'description', e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:bg-white focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Responsável</label>
          <input
            ref={respRef}
            defaultValue={action.responsible}
            disabled={isFinalized}
            onBlur={e => onFieldBlur(action.id, 'responsible', e.target.value)}
            placeholder="Nome do responsável"
            className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none disabled:opacity-60 ${
              !action.responsible
                ? 'border-amber-300 bg-amber-50 placeholder-amber-400'
                : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
            }`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Prazo</label>
          <input
            ref={dateRef}
            type="date"
            defaultValue={action.due_date}
            disabled={isFinalized}
            onBlur={e => onFieldBlur(action.id, 'due_date', e.target.value)}
            className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none disabled:opacity-60 ${
              !action.due_date
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
            }`}
          />
        </div>
        <div className="flex items-end">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            action.status === 'concluida' ? 'bg-green-100 text-green-700'
            : action.status === 'atrasada' ? 'bg-red-100 text-red-700'
            : action.status === 'em_andamento' ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {action.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  )
}
