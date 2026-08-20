import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { listCatalogPrograms } from '@/app/actions/programs'
import { CatalogoClient } from './CatalogoClient'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role ?? null
  const programs = await listCatalogPrograms()

  return (
    <>
      <Header title="Catálogo de Programas" />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Programas padrão ficam disponíveis para todos os usuários ao montar planos de ação.
            {role === 'superadmin' && ' Apenas a administração da plataforma pode criar, editar e excluir programas do catálogo padrão.'}
            {role === 'admin' && ' Você pode criar seus próprios programas personalizados; apenas a administração da plataforma edita os programas do catálogo padrão.'}
            {role !== 'superadmin' && role !== 'admin' && ' Apenas administradores podem criar, editar e excluir programas.'}
          </div>
          <CatalogoClient initialPrograms={programs} role={role} />
        </div>
      </div>
    </>
  )
}
