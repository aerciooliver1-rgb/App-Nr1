import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { listPadraoPrograms } from '@/app/actions/programs'
import { CatalogoClient } from './CatalogoClient'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return (
      <>
        <Header title="Catálogo de Programas" />
        <div className="flex h-[60vh] items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Acesso restrito</p>
            <p className="mt-1 text-xs text-gray-400">
              Apenas administradores podem gerenciar o catálogo de programas.
            </p>
          </div>
        </div>
      </>
    )
  }

  const programs = await listPadraoPrograms()

  return (
    <>
      <Header title="Catálogo de Programas" />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Programas padrão ficam disponíveis para todos os usuários ao montar planos de ação.
            Apenas administradores podem criar, editar e excluir programas deste catálogo.
          </div>
          <CatalogoClient initialPrograms={programs} />
        </div>
      </div>
    </>
  )
}
