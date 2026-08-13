'use client'

import { useActionState, useState, useTransition, useRef } from 'react'
import { RiskBadge } from '@/components/features/RiskBadge'
import { addAction, updateAction, deleteAction, finalizePlan } from '@/app/actions/plans'
import type { ActionRow, DocProgram } from './page'
import type { RiskLevel } from '@/types/database'

interface Props {
  planId: string
  planStatus: string
  assessmentId: string
  companyId: string
  sectorId: string
  initialActions: ActionRow[]
  factorMap: Record<string, string>
  companyName: string
  consultantName: string
  consultantCRP: string
  programByFactorLevel: Record<string, DocProgram>
}

export function PlanoClient({
  planId,
  planStatus,
  assessmentId,
  companyId,
  sectorId,
  initialActions,
  factorMap,
  companyName,
  consultantName,
  consultantCRP,
  programByFactorLevel,
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
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-8 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Nenhuma ação no plano</h3>
          <p className="mt-1.5 text-sm text-gray-400">
            Selecione intervenções na etapa anterior para gerar ações automaticamente,<br />
            ou adicione uma ação manualmente.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <a
              href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/intervencoes`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Voltar às Intervenções
            </a>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Adicionar ação manual
            </button>
          </div>
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
              docProgram={
                action.factor_id && action.risk_level && action.risk_level !== 'baixo'
                  ? programByFactorLevel[`${action.factor_id}-${action.risk_level}`]
                  : undefined
              }
              companyName={companyName}
              consultantName={consultantName}
              consultantCRP={consultantCRP}
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
  docProgram,
  companyName,
  consultantName,
  consultantCRP,
}: {
  action: ActionRow
  factorName?: string
  isFinalized: boolean
  isDeleting: boolean
  onFieldBlur: (id: string, field: 'description' | 'responsible' | 'due_date', value: string) => void
  onDelete: (id: string) => void
  docProgram?: DocProgram
  companyName: string
  consultantName: string
  consultantCRP: string
}) {
  const [showDoc, setShowDoc] = useState(false)
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
        <div className="flex items-end justify-between gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            action.status === 'concluida' ? 'bg-green-100 text-green-700'
            : action.status === 'atrasada' ? 'bg-red-100 text-red-700'
            : action.status === 'em_andamento' ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {action.status.replace('_', ' ')}
          </span>
          {docProgram && (
            <button
              onClick={() => setShowDoc(true)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-100"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5">
                <path d="M6 2h6l4 4v10a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 16V3.5A1.5 1.5 0 0 1 5.5 2z" strokeLinejoin="round" />
                <path d="M12 2v4h4M7 10h6M7 13h6" strokeLinecap="round" />
              </svg>
              Documentação
            </button>
          )}
        </div>
      </div>

      {showDoc && docProgram && (
        <DocumentacaoModal
          program={docProgram}
          companyName={companyName}
          consultantName={consultantName}
          consultantCRP={consultantCRP}
          responsavel={action.responsible}
          prazo={action.due_date}
          onClose={() => setShowDoc(false)}
        />
      )}
    </div>
  )
}

// ─── Documentação — modelo de entregável pronto para preencher e imprimir ─────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayBR() {
  const [y, m, d] = todayISO().split('-')
  return `${d}/${m}/${y}`
}

/** Divide uma linha do modelo em sub-campos "Rótulo: valor" separados por 2+ espaços. */
function parseFieldLine(line: string): { label: string | null; isDate: boolean }[] {
  const segments = line.split(/\s{2,}/).filter(Boolean)
  return segments.map(seg => {
    const m = seg.match(/^(.+?):\s*(.*)$/)
    const label = m ? m[1].trim() : null
    const rest = m ? m[2] : seg
    const isDate = /_\/_|__\/__|\d\/\d/.test(rest) || /^_+\/_+\/_+$/.test(rest.trim())
    return { label, isDate }
  })
}

function DocumentacaoModal({
  program,
  companyName,
  consultantName,
  consultantCRP,
  responsavel,
  prazo,
  onClose,
}: {
  program: DocProgram
  companyName: string
  consultantName: string
  consultantCRP: string
  responsavel: string
  prazo: string
  onClose: () => void
}) {
  const fieldLines = (program.deliverable_content_fields ?? '').split('\n').filter(Boolean)
  const [values, setValues] = useState<Record<string, string>>({})

  function setValue(key: string, v: string) {
    setValues(prev => ({ ...prev, [key]: v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Barra de ações — some na impressão */}
        <div className="no-print flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Documentação do entregável</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <path d="M6 8V3h8v5M6 17h8v-5H6v5zM4 13h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1z" strokeLinejoin="round" />
              </svg>
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M15 5 5 15M5 5l10 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Documento — área impressa */}
        <div className="print-area overflow-y-auto px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {program.code} — Modelo de entregável
          </p>
          <h4 className="mt-1 text-lg font-bold text-gray-900">{program.deliverable_title}</h4>

          {/* Identificação */}
          <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Identificação</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Labeled label="Empresa" value={companyName} />
              <Labeled label="Data" value={todayBR()} />
              <Labeled label="Programa" value={`${program.code} — ${program.name}`} span2 />
              <Labeled label="Consultor/a responsável" value={consultantName} />
              <Labeled label="CRP (se aplicável)" value={consultantCRP} />
            </div>
          </div>

          {/* Conteúdo específico do entregável */}
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {program.deliverable_content_label}
            </p>
            {fieldLines.map((line, i) => {
              const segments = parseFieldLine(line)
              return (
                <div key={i} className="flex flex-wrap gap-3">
                  {segments.map((seg, j) => {
                    const key = `${i}-${j}`
                    return (
                      <div key={key} className="flex-1 min-w-[140px]">
                        {seg.label && (
                          <label className="mb-0.5 block text-xs font-medium text-gray-500">{seg.label}</label>
                        )}
                        <input
                          type={seg.isDate ? 'date' : 'text'}
                          value={values[key] ?? ''}
                          onChange={e => setValue(key, e.target.value)}
                          className="w-full border-b border-gray-300 bg-transparent py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none print:border-b print:border-gray-400"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Responsáveis e prazos */}
          <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Responsáveis e prazos</p>
            <Labeled label="Responsável pela implementação" value={responsavel} editableDefault />
            <div className="grid grid-cols-2 gap-x-4">
              <Labeled label="Prazo de implementação" value={prazo} type="date" editableDefault />
              <Labeled label="Data de verificação na plataforma" value="" type="date" editableDefault />
            </div>
          </div>

          {/* Assinaturas */}
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assinaturas</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Labeled label="Gestor/Direção" value="" editableDefault />
              <Labeled label="Data" value="" type="date" editableDefault />
              <Labeled label="Consultor/a" value={consultantName} editableDefault />
              <Labeled label="Data" value={todayISO()} type="date" editableDefault />
            </div>
          </div>
        </div>

        <div className="no-print flex justify-end border-t border-gray-100 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Campo rotulado do documento: readonly quando `value` vem de dados já conhecidos; editável quando `editableDefault`. */
function Labeled({
  label,
  value,
  type = 'text',
  span2 = false,
  editableDefault = false,
}: {
  label: string
  value: string
  type?: 'text' | 'date'
  span2?: boolean
  editableDefault?: boolean
}) {
  const [v, setV] = useState(value)
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="mb-0.5 block text-xs font-medium text-gray-500">{label}</label>
      {editableDefault ? (
        <input
          type={type}
          value={v}
          onChange={e => setV(e.target.value)}
          className="w-full border-b border-gray-300 bg-transparent py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
        />
      ) : (
        <p className="border-b border-gray-200 py-1 text-sm text-gray-800">{value || '—'}</p>
      )}
    </div>
  )
}
