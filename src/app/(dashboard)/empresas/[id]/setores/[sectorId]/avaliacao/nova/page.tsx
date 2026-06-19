'use client'

import { use, useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { createAssessmentModeA, createAssessmentModeB } from '@/app/actions/assessments'
import { SubmitButton } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { TOTAL_QUESTIONS } from '@/lib/data/questions'

type Mode = 'A' | 'B' | null

export default function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string }>
}) {
  const { id, sectorId } = use(params)
  const [mode, setMode] = useState<Mode>(null)

  const createModeA = createAssessmentModeA.bind(null)
  const createModeB = createAssessmentModeB.bind(null)

  const [stateA, actionA] = useActionState(createModeA, undefined)
  const [stateB, actionB] = useActionState(createModeB, undefined)

  const state = mode === 'A' ? stateA : stateB

  return (
    <>
      <Header title="Iniciar Avaliação" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">

          {/* Seleção de Modo */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('A')}
              className={`rounded-xl border-2 p-6 text-left transition-colors ${
                mode === 'A'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">Modo A</span>
                {mode === 'A' && <span className="text-blue-500">✓</span>}
              </div>
              <h3 className="font-semibold text-gray-900">Avaliação Institucional</h3>
              <p className="mt-1 text-sm text-gray-500">
                A psicóloga responde com base em observação técnica, entrevistas e experiência profissional.
                Ideal para avaliação inicial rápida ou setores com menos de 5 trabalhadores.
              </p>
            </button>

            <button
              onClick={() => setMode('B')}
              className={`rounded-xl border-2 p-6 text-left transition-colors ${
                mode === 'B'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Modo B</span>
                {mode === 'B' && <span className="text-green-500">✓</span>}
              </div>
              <h3 className="font-semibold text-gray-900">Survey Anônimo</h3>
              <p className="mt-1 text-sm text-gray-500">
                Os trabalhadores respondem anonimamente via link/QR Code. Nenhum dado pessoal é coletado.
                Obrigatório por força do Guia MTE 2025 quando usando questionário.
              </p>
            </button>
          </div>

          {/* Informações do instrumento */}
          {mode && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
              <p>
                O instrumento contém <strong>{TOTAL_QUESTIONS} questões</strong> distribuídas em{' '}
                <strong>13 fatores de risco psicossocial</strong> conforme o Guia MTE 2025 / NR-1 cap. 1.5.
              </p>
              {mode === 'B' && (
                <p className="mt-2 text-green-700">
                  <strong>Anonimato garantido:</strong> nenhum dado pessoal (nome, e-mail, CPF, IP) é coletado no Modo B.
                  Mínimo recomendado: 5 respondentes por setor (ISO 45003:2021).
                </p>
              )}
            </div>
          )}

          {/* Formulário Modo A */}
          {mode === 'A' && (
            <form action={actionA} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">Confirmar Avaliação Institucional</h3>
              <input type="hidden" name="sector_id" value={sectorId} />
              <input type="hidden" name="company_id" value={id} />
              {state?.message && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</div>
              )}
              <div className="flex gap-3">
                <Link
                  href={`/empresas/${id}`}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <SubmitButton className="flex-1 justify-center">Iniciar questionário →</SubmitButton>
              </div>
            </form>
          )}

          {/* Formulário Modo B */}
          {mode === 'B' && (
            <form action={actionB} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">Configurar Survey Anônimo</h3>
              <input type="hidden" name="sector_id" value={sectorId} />
              <input type="hidden" name="company_id" value={id} />

              <div className="mb-4 flex flex-col gap-1">
                <label htmlFor="expires_at" className="text-sm font-medium text-gray-700">
                  Prazo de coleta *
                </label>
                <input
                  id="expires_at"
                  name="expires_at"
                  type="datetime-local"
                  required
                  min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                {state?.errors?.expires_at && (
                  <p className="text-xs text-red-600">{state.errors.expires_at[0]}</p>
                )}
                <p className="text-xs text-gray-400">
                  O link ficará ativo até esta data. Você poderá estender o prazo depois.
                </p>
              </div>

              {state?.message && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</div>
              )}

              <div className="flex gap-3">
                <Link
                  href={`/empresas/${id}`}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <SubmitButton className="flex-1 justify-center bg-green-600 hover:bg-green-700">
                  Gerar link e QR Code →
                </SubmitButton>
              </div>
            </form>
          )}

          {!mode && (
            <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
              Selecione um modo de avaliação acima para continuar.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
