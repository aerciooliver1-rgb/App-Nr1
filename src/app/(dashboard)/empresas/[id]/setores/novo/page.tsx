'use client'

import Link from 'next/link'
import { use } from 'react'
import { useActionState } from 'react'
import { createSector } from '@/app/actions/companies'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'

export default function NovoSetorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const createSectorForCompany = createSector.bind(null, id)
  const [state, action] = useActionState(createSectorForCompany, undefined)

  return (
    <>
      <Header title="Novo Setor" />
      <div className="p-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {state?.message && (
              <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.message}
              </div>
            )}

            <form action={action} className="flex flex-col gap-5">
              <Input
                id="name"
                name="name"
                label="Nome do Setor *"
                placeholder="Ex: Recursos Humanos, Produção, TI"
                required
                error={state?.errors?.name?.[0]}
              />
              <Input
                id="employee_count"
                name="employee_count"
                type="number"
                min="1"
                label="Total de Funcionários *"
                placeholder="Quantidade de funcionários neste setor"
                required
                error={state?.errors?.employee_count?.[0]}
              />
              <p className="text-xs text-gray-400">
                O total de funcionários é usado no Modo B (avaliação anônima) para calcular a taxa de resposta.
              </p>

              <div className="flex gap-3 pt-2">
                <Link
                  href={`/empresas/${id}`}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <SubmitButton className="flex-1 justify-center">Cadastrar Setor</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
