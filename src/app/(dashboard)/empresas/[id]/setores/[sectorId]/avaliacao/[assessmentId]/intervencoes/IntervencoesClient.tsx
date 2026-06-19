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

type Tab = 'meus' | 'catalogo'

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
  const [selectedFactor, setSelectedFactor] = useState<string | null>(factors[0]?.id ?? null)
  const [activeTab, setActiveTab] = useState<Tab>('catalogo')
  const [meusPrograms, setMeusPrograms] = useState<Program[]>(initialMeus)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [createState, createAction] = useActionState(createCustomProgram, undefined)

  // Adiciona novo programa ao estado local após criação
  useEffect(() => {
    if (createState?.program) {
      setMeusPrograms(prev => [createState.program!, ...prev])
      setShowCreateForm(false)
      setActiveTab('meus')
    }
  }, [createState])

  const criticalAndHigh = factors.filter(f => f.level === 'critico' || f.level === 'alto')
  const missingInterventions = criticalAndHigh.filter(f => !(interventions[f.id]?.length > 0))
  const canAdvance = missingInterventions.length === 0

  function isSelected(factorId: string, programId: string) {
    return interventions[factorId]?.includes(programId) ?? false
  }

  async function handleToggle(factorId: string, programId: string) {
    const key = `${factorId}-${programId}`
    setToggling(key)

    // Optimistic update
    const wasSelected = isSelected(factorId, programId)
    setInterventions(prev => {
      const current = prev[factorId] ?? []
      return {
        ...prev,
        [factorId]: wasSelected
          ? current.filter(id => id !== programId)
          : [...current, programId],
      }
    })

    const result = await toggleIntervention(assessmentId, factorId, programId)
    if (result.error) {
      // Reverte
      setInterventions(prev => {
        const current = prev[factorId] ?? []
        return {
          ...prev,
          [factorId]: wasSelected
            ? [...current, programId]
            : current.filter(id => id !== programId),
        }
      })
    }
    setToggling(null)
  }

  function handleAdvance() {
    if (!canAdvance) return
    startTransition(async () => {
      const result = await initializePlan(assessmentId, companyId, sectorId)
      if (result?.error) setPlanError(result.error)
    })
  }

  const currentPrograms = activeTab === 'meus' ? meusPrograms : catalogoPrograms

  return (
    <div className="flex flex-col gap-6">
      {/* Alerta de bloqueio */}
      {!canAdvance && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Atenção: {missingInterventions.length} fator(es) crítico(s)/alto(s) sem intervenção selecionada
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
            {missingInterventions.map(f => <li key={f.id}>{f.name}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lista de fatores */}
        <div className="flex flex-col gap-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fatores de Risco</p>
          {factors.map(f => {
            const count = interventions[f.id]?.length ?? 0
            const needsIntervention = f.level === 'critico' || f.level === 'alto'
            const isMissing = needsIntervention && count === 0

            return (
              <button
                key={f.id}
                onClick={() => setSelectedFactor(f.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedFactor === f.id
                    ? 'border-blue-500 bg-blue-50'
                    : isMissing
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-400">{f.id}</span>
                  <RiskBadge level={f.level} />
                </div>
                <p className="mt-1 text-xs font-medium text-gray-800 line-clamp-2">{f.name}</p>
                {count > 0 && (
                  <p className="mt-1 text-xs text-green-600">✓ {count} programa(s) selecionado(s)</p>
                )}
                {isMissing && (
                  <p className="mt-1 text-xs text-red-600">⚠ Intervenção obrigatória</p>
                )}
              </button>
            )
          })}
        </div>

        {/* Catálogo de programas */}
        <div className="lg:col-span-2">
          {selectedFactor && (() => {
            const factor = factors.find(f => f.id === selectedFactor)!
            return (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-4">
                  <p className="text-xs font-medium text-gray-400">{factor.id}</p>
                  <h3 className="font-semibold text-gray-900">{factor.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">Score: {factor.score.toFixed(0)}/100</span>
                    <RiskBadge level={factor.level} />
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
                <div className="max-h-80 overflow-y-auto p-4">
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
                        : 'Nenhum programa no catálogo.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {currentPrograms.map(program => {
                        const selected = isSelected(selectedFactor, program.id)
                        const key = `${selectedFactor}-${program.id}`
                        const isToggling = toggling === key

                        return (
                          <button
                            key={program.id}
                            onClick={() => handleToggle(selectedFactor, program.id)}
                            disabled={isToggling}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                              selected
                                ? 'border-green-400 bg-green-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <span className={`mt-0.5 shrink-0 text-base ${selected ? 'text-green-600' : 'text-gray-300'}`}>
                              {selected ? '✓' : '○'}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{program.name}</p>
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
              </div>
            )
          })()}
        </div>
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
          title={!canAdvance ? 'Selecione intervenções para todos os fatores críticos/altos' : ''}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {isPending ? 'Gerando plano…' : 'Avançar para Plano de Ação →'}
        </button>
      </div>
    </div>
  )
}
