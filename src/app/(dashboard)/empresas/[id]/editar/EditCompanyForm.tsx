'use client'

import Link from 'next/link'
import { useActionState, useTransition } from 'react'
import { updateCompany, deleteCompany } from '@/app/actions/companies'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'

const SIZES = ['Microempresa', 'Pequeno porte', 'Médio porte', 'Grande porte']

interface Props {
  companyId: string
  defaultValues: {
    name: string
    cnpj: string
    size: string | null
    economic_sector: string | null
    contact_name: string | null
    contact_email: string | null
  }
}

export function EditCompanyForm({ companyId, defaultValues }: Props) {
  const updateBound = updateCompany.bind(null, companyId)
  const [state, action] = useActionState(updateBound, undefined)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Excluir esta empresa? Todos os setores e avaliações serão removidos permanentemente.')) return
    startTransition(() => { deleteCompany(companyId) })
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
        label="Razão Social *"
        defaultValue={defaultValues.name}
        placeholder="Nome da empresa"
        required
        error={state?.errors?.name?.[0]}
      />

      <Input
        id="cnpj"
        name="cnpj"
        label="CNPJ *"
        defaultValue={defaultValues.cnpj}
        placeholder="00.000.000/0000-00"
        required
        error={state?.errors?.cnpj?.[0]}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="size" className="text-sm font-medium text-gray-700">Porte</label>
        <select
          id="size"
          name="size"
          defaultValue={defaultValues.size ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecione</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Input
        id="economic_sector"
        name="economic_sector"
        label="Setor Econômico"
        defaultValue={defaultValues.economic_sector ?? ''}
        placeholder="Ex: Saúde, Tecnologia, Indústria"
        error={state?.errors?.economic_sector?.[0]}
      />

      <Input
        id="contact_name"
        name="contact_name"
        label="Nome do Contato"
        defaultValue={defaultValues.contact_name ?? ''}
        placeholder="Responsável pelo contato"
      />

      <Input
        id="contact_email"
        name="contact_email"
        type="email"
        label="E-mail do Contato"
        defaultValue={defaultValues.contact_email ?? ''}
        placeholder="contato@empresa.com.br"
        error={state?.errors?.contact_email?.[0]}
      />

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
          {isPending ? 'Excluindo...' : 'Excluir Empresa'}
        </button>
      </div>
    </form>
  )
}
