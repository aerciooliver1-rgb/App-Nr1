'use client'

import Link from 'next/link'
import { useActionState, useTransition } from 'react'
import { updateSector, deleteSector } from '@/app/actions/companies'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'

interface Props {
  companyId: string
  sectorId: string
  currentName: string
  currentEmployeeCount: number
  currentManagerName: string | null
}

export function EditSectorForm({ companyId, sectorId, currentName, currentEmployeeCount, currentManagerName }: Props) {
  const updateSectorBound = updateSector.bind(null, sectorId, companyId)
  const [state, action] = useActionState(updateSectorBound, undefined)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Excluir este setor? Todas as avaliações vinculadas serão removidas permanentemente.')) return
    startTransition(() => { deleteSector(sectorId, companyId) })
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          state.message.includes('sucesso')
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {state.message}
        </div>
      )}

      <Input
        id="name"
        name="name"
        label="Nome do Setor *"
        defaultValue={currentName}
        placeholder="Ex: Recursos Humanos, Produção, TI"
        required
        error={state?.errors?.name?.[0]}
      />

      <div className="flex flex-col gap-1">
        <Input
          id="employee_count"
          name="employee_count"
          type="number"
          min="1"
          step="1"
          label="Total de Funcionários *"
          defaultValue={String(currentEmployeeCount)}
          placeholder="Quantidade de funcionários neste setor"
          required
          error={state?.errors?.employee_count?.[0]}
        />
        <p className="text-xs text-gray-400">
          Mínimo de 1 funcionário. Este valor define o denominador da taxa de resposta no Modo B.
        </p>
      </div>

      <Input
        id="manager_name"
        name="manager_name"
        label="Gerente(s) Responsável(is)"
        defaultValue={currentManagerName ?? ''}
        placeholder="Ex: Maria Silva · João Costa"
        error={state?.errors?.manager_name?.[0]}
      />

      {currentEmployeeCount === 0 && !state?.errors?.employee_count && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este setor está com 0 funcionários — atualize para habilitar avaliações corretamente.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href={`/empresas/${companyId}`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <SubmitButton className="flex-1 justify-center">Salvar Alterações</SubmitButton>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-6">
        <p className="mb-3 text-xs text-gray-400">Zona de perigo</p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isPending ? 'Excluindo...' : 'Excluir Setor'}
        </button>
      </div>
    </form>
  )
}
