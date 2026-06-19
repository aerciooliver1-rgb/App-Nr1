'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createCompany } from '@/app/actions/companies'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'

const SIZES = ['Microempresa', 'Pequeno porte', 'Médio porte', 'Grande porte']

export default function NovaEmpresaPage() {
  const [state, action] = useActionState(createCompany, undefined)

  return (
    <>
      <Header title="Nova Empresa" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl">
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
                label="Razão Social *"
                placeholder="Nome da empresa"
                required
                error={state?.errors?.name?.[0]}
              />
              <Input
                id="cnpj"
                name="cnpj"
                label="CNPJ *"
                placeholder="00.000.000/0000-00"
                required
                error={state?.errors?.cnpj?.[0]}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="size" className="text-sm font-medium text-gray-700">Porte</label>
                <select
                  id="size"
                  name="size"
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
                placeholder="Ex: Saúde, Tecnologia, Indústria"
                error={state?.errors?.economic_sector?.[0]}
              />
              <Input
                id="contact_name"
                name="contact_name"
                label="Nome do Contato"
                placeholder="Responsável pelo contato"
              />
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                label="E-mail do Contato"
                placeholder="contato@empresa.com.br"
                error={state?.errors?.contact_email?.[0]}
              />

              <div className="flex gap-3 pt-2">
                <Link
                  href="/empresas"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <SubmitButton className="flex-1 justify-center">Cadastrar Empresa</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
