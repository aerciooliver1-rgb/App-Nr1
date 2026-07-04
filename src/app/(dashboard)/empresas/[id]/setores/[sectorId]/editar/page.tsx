import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { EditSectorForm } from './EditSectorForm'

async function getSector(sectorId: string, companyId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sectors')
    .select('id, name, employee_count, company_id')
    .eq('id', sectorId)
    .eq('company_id', companyId)
    .single()
  return data
}

export default async function EditarSetorPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string }>
}) {
  const { id, sectorId } = await params
  const sector = await getSector(sectorId, id)
  if (!sector) notFound()

  return (
    <>
      <Header title={`Editar Setor — ${sector.name}`} />
      <div className="p-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <EditSectorForm
              companyId={id}
              sectorId={sectorId}
              currentName={sector.name}
              currentEmployeeCount={sector.employee_count ?? 0}
            />
          </div>
        </div>
      </div>
    </>
  )
}
