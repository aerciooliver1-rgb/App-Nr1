import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { EditCompanyForm } from './EditCompanyForm'

async function getCompany(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('companies')
    .select('id, name, cnpj, size, economic_sector, contact_name, contact_email')
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  return data
}

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const company = await getCompany(id)
  if (!company) notFound()

  return (
    <>
      <Header title={`Editar — ${company.name}`} />
      <div className="p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <EditCompanyForm
              companyId={id}
              defaultValues={{
                name: company.name,
                cnpj: company.cnpj,
                size: company.size,
                economic_sector: company.economic_sector,
                contact_name: company.contact_name,
                contact_email: company.contact_email,
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
