'use client'

import { useActionState, useState, useTransition, useEffect } from 'react'
import { RiskBadge } from '@/components/features/RiskBadge'
import { toggleIntervention, createCustomProgram } from '@/app/actions/interventions'
import { initializePlan } from '@/app/actions/plans'
import type { Program } from '@/app/actions/interventions'
import type { RiskLevel } from '@/types/database'

interface FactorWithScore {
  id: string
  name: string
  dimension: string
  score: number
  level: RiskLevel
}

interface Props {
  assessmentId: string
  companyId: string
  sectorId: string
  factors: FactorWithScore[]
  initialInterventions: Record<string, string[]>
  meusPrograms: Program[]
  catalogoPrograms: Program[]
}

const RISK_STRIPE: Record<RiskLevel, string> = {
  critico: 'border-l-red-500',
  alto: 'border-l-orange-400',
  moderado: 'border-l-amber-400',
  baixo: 'border-l-emerald-400',
}

function IconChevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function IntervencoesClient({
  assessmentId,
  companyId,
  sectorId,
  factors,
  initialInterventions,
  meusPrograms: initialMeus,
  catalogoPrograms,
}: Props) {
  const [interventions, setInterventions] = useState<Record<string, string[]>>(initialInterventions)
  const [meusPrograms, setMeusPrograms] = useState<Program[]>(initialMeus)
  const [modalFactorId, setModalFactorId] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // O catálogo de 39 programas cobre Moderado (prevenção), Alto e Crítico —
  // só o nível Baixo dispensa intervenção.
  const factorsNeedingIntervention = factors.filter(f => f.level !== 'baixo')
  const missingInterventions = factorsNeedingIntervention.filter(f => !(interventions[f.id]?.length > 0))
  const canAdvance = missingInterventions.length === 0
  const withInterventionCount = factors.filter(f => interventions[f.id]?.length > 0).length

  async function persistFactorSelection(factorId: string, newIds: string[]) {
    const oldIds = interventions[factorId] ?? []
    const toAdd = newIds.filter(id => !oldIds.includes(id))
    const toRemove = oldIds.filter(id => !newIds.includes(id))

    setInterventions(prev => ({ ...prev, [factorId]: newIds }))

    const results = await Promise.all(
      [...toAdd, ...toRemove].map(id => toggleIntervention(assessmentId, factorId, id)),
    )
    if (results.some(r => r.error)) {
      // Reverte em caso de falha — recarrega a partir do estado anterior
      setInterventions(prev => ({ ...prev, [factorId]: oldIds }))
    }
  }

  function handleAdvance() {
    if (!canAdvance) return
    startTransition(async () => {
      const result = await initializePlan(assessmentId, companyId, sectorId)
      if (result?.error) setPlanError(result.error)
    })
  }

  const modalFactor = factors.find(f => f.id === modalFactorId) ?? null

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo + alerta de bloqueio */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-400">
          {withInterventionCount} de {factors.length} fator(es) com intervenção selecionada
        </p>
        {!canAdvance && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              Atenção: {missingInterventions.length} fator(es) sem intervenção selecionada
            </p>
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
              {missingInterventions.map(f => <li key={f.id}>{f.name}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Lista de fatores — estilo cards da página Empresas */}
      <div className="flex flex-col gap-3">
        {factors.map(f => {
          const count = interventions[f.id]?.length ?? 0
          const needsIntervention = f.level !== 'baixo'
          const isMissing = needsIntervention && count === 0

          return (
            <div
              key={f.id}
              className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-l-4 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md ${
                isMissing ? 'border-red-200 bg-red-50/40' : 'border-gray-200'
              } ${RISK_STRIPE[f.level]}`}
            >
              <div className="min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">{f.id}</span>
                  <RiskBadge level={f.level} />
                </div>
                <p className="mt-1 font-medium text-gray-900">{f.name}</p>
                {count > 0 ? (
                  <p className="mt-1 text-xs text-green-600">✓ {count} programa(s) selecionado(s)</p>
                ) : isMissing ? (
                  <p className="mt-1 text-xs text-red-600">⚠ Intervenção obrigatória</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Score: {f.score.toFixed(0)}/100</p>
                )}
              </div>

              <button
                onClick={() => setModalFactorId(f.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  count > 0
                    ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {count > 0 ? 'Editar intervenção' : 'Aplicar intervenção'}
                <IconChevron />
              </button>
            </div>
          )
        })}
      </div>

      {/* Erro ao avançar */}
      {planError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{planError}</div>
      )}

      {/* Botão avançar */}
      <div className="flex justify-end">
        <button
          onClick={handleAdvance}
          disabled={!canAdvance || isPending}
          title={!canAdvance ? 'Selecione intervenções para todos os fatores com risco (exceto Baixo)' : ''}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {isPending ? 'Gerando plano…' : 'Avançar para Plano de Ação →'}
        </button>
      </div>

      {modalFactor && (
        <IntervencaoModal
          factor={modalFactor}
          selectedProgramIds={interventions[modalFactor.id] ?? []}
          meusPrograms={meusPrograms}
          catalogoPrograms={catalogoPrograms.filter(p => !p.factor_ids || p.factor_ids === modalFactor.id)}
          onProgramCreated={program => setMeusPrograms(prev => [program, ...prev])}
          onConfirm={newIds => {
            persistFactorSelection(modalFactor.id, newIds)
            setModalFactorId(null)
          }}
          onClose={() => setModalFactorId(null)}
        />
      )}
    </div>
  )
}

// ─── Popup de seleção de intervenção — por fator ──────────────────────────────

type Tab = 'catalogo' | 'meus'

function IntervencaoModal({
  factor,
  selectedProgramIds,
  meusPrograms,
  catalogoPrograms,
  onProgramCreated,
  onConfirm,
  onClose,
}: {
  factor: FactorWithScore
  selectedProgramIds: string[]
  meusPrograms: Program[]
  catalogoPrograms: Program[]
  onProgramCreated: (program: Program) => void
  onConfirm: (newIds: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedProgramIds))
  const [activeTab, setActiveTab] = useState<Tab>('catalogo')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createState, createAction] = useActionState(createCustomProgram, undefined)

  useEffect(() => {
    if (createState?.program) {
      onProgramCreated(createState.program)
      setShowCreateForm(false)
      setActiveTab('meus')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState])

  function toggleDraft(programId: string) {
    setDraft(prev => {
      const next = new Set(prev)
      if (next.has(programId)) next.delete(programId)
      else next.add(programId)
      return next
    })
  }

  const currentPrograms = [...(activeTab === 'meus' ? meusPrograms : catalogoPrograms)].sort(
    (a, b) => (b.level === factor.level ? 1 : 0) - (a.level === factor.level ? 1 : 0),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        {/* Cabeçalho */}
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400">{factor.id}</p>
              <h3 className="font-semibold text-gray-900">{factor.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-500">Score: {factor.score.toFixed(0)}/100</span>
                <RiskBadge level={factor.level} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M15 5 5 15M5 5l10 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['catalogo', 'meus'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'catalogo' ? 'Catálogo Geral' : `Meus Programas (${meusPrograms.length})`}
            </button>
          ))}
        </div>

        {/* Programas */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'meus' && (
            <div className="mb-3">
              <button
                onClick={() => setShowCreateForm(v => !v)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showCreateForm ? '× Cancelar' : '+ Criar programa personalizado'}
              </button>

              {showCreateForm && (
                <form action={createAction} className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="mb-2">
                    <input
                      name="name"
                      placeholder="Nome do programa *"
                      required
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {createState?.errors?.name && (
                      <p className="mt-0.5 text-xs text-red-600">{createState.errors.name[0]}</p>
                    )}
                  </div>
                  <textarea
                    name="description"
                    placeholder="Descrição (opcional)"
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Criar e adicionar
                  </button>
                  {createState?.message && (
                    <p className="mt-1 text-xs text-red-600">{createState.message}</p>
                  )}
                </form>
              )}
            </div>
          )}

          {currentPrograms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {activeTab === 'meus'
                ? 'Nenhum programa personalizado. Crie um acima.'
                : 'Nenhum programa no catálogo para este fator.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {currentPrograms.map(program => {
                const selected = draft.has(program.id)
                const recommended = activeTab === 'catalogo' && program.level === factor.level

                return (
                  <button
                    key={program.id}
                    onClick={() => toggleDraft(program.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-green-400 bg-green-50'
                        : recommended
                        ? 'border-blue-300 bg-blue-50/50 hover:border-blue-400'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 text-base ${selected ? 'text-green-600' : 'text-gray-300'}`}>
                      {selected ? '✓' : '○'}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {program.level && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            program.level === 'critico' ? 'bg-red-100 text-red-700'
                            : program.level === 'alto' ? 'bg-orange-100 text-orange-700'
                            : 'bg-amber-100 text-amber-800'
                          }`}>
                            {program.level}
                          </span>
                        )}
                        {recommended && (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900">{program.name}</p>
                      {program.description && (
                        <p className="text-xs text-gray-500">{program.description}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé — confirmar */}
        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(Array.from(draft))}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Confirmar {draft.size > 0 && `(${draft.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}
