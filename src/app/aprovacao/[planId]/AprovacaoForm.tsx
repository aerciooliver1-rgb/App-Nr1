'use client'

import { useActionState } from 'react'
import { recordApproval } from '@/app/actions/approvals'
import type { ApprovalFormState } from '@/app/actions/approvals'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-8"
    >
      {pending ? 'Registrando…' : 'Registrar Avaliação'}
    </button>
  )
}

export function AprovacaoForm({ planId }: { planId: string }) {
  const boundAction = recordApproval.bind(null, planId)
  const [state, formAction] = useActionState<ApprovalFormState, FormData>(boundAction, undefined)

  if (state?.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 text-lg font-bold text-green-900">Avaliação registrada com sucesso!</h2>
        <p className="mt-2 text-sm text-green-700">
          Obrigado. Sua avaliação foi salva e a equipe responsável será notificada.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-lg font-bold text-gray-900">Registrar Avaliação</h3>
      <p className="mb-5 text-sm text-gray-500">
        Revise o diagnóstico e o plano de ação acima e registre sua decisão.
      </p>

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Decisão *
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'aprovado', label: 'Aprovado', color: 'border-green-400 bg-green-50 text-green-800' },
              { value: 'com_ressalvas', label: 'Aprovado com Ressalvas', color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
              { value: 'em_revisao', label: 'Em Revisão', color: 'border-orange-400 bg-orange-50 text-orange-800' },
            ].map(opt => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  required
                  className="sr-only"
                />
                <span className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all peer-checked:ring-2 ${opt.color} has-[:checked]:ring-2`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {state?.errors?.status && (
            <p className="mt-1 text-xs text-red-600">{state.errors.status[0]}</p>
          )}
        </div>

        {/* Nome do responsável */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">
            Seu nome completo *
          </label>
          <input
            name="approved_by"
            type="text"
            required
            placeholder="Nome do gestor responsável"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {state?.errors?.approved_by && (
            <p className="mt-1 text-xs text-red-600">{state.errors.approved_by[0]}</p>
          )}
        </div>

        {/* Data */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">
            Data da avaliação *
          </label>
          <input
            name="approved_at"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:w-auto"
          />
          {state?.errors?.approved_at && (
            <p className="mt-1 text-xs text-red-600">{state.errors.approved_at[0]}</p>
          )}
        </div>

        {/* Observações */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">
            Observações
            <span className="ml-1 text-xs font-normal text-gray-400">(obrigatório se "Com Ressalvas")</span>
          </label>
          <textarea
            name="notes"
            rows={4}
            placeholder="Descreva ressalvas, condições para aprovação, ou pontos a revisar…"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {state?.errors?.notes && (
            <p className="mt-1 text-xs text-red-600">{state.errors.notes[0]}</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
