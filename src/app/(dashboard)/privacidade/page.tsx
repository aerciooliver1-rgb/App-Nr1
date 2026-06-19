import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { listUsers } from '@/app/actions/users'
import { PrivacidadeClient } from './PrivacidadeClient'

export default async function PrivacidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return (
      <>
        <Header title="Privacidade e LGPD" />
        <div className="flex h-[60vh] items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Acesso restrito</p>
            <p className="mt-1 text-xs text-gray-400">
              Apenas administradores podem acessar ferramentas de privacidade LGPD.
            </p>
          </div>
        </div>
      </>
    )
  }

  const users = await listUsers()

  return (
    <>
      <Header title="Privacidade e LGPD" />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-700">
            <strong>LGPD — Lei nº 13.709/2018.</strong> Esta área permite localizar colaboradores,
            exportar todos os seus dados pessoais em formato JSON (portabilidade — Art. 18, V) e
            solicitar exclusão permanente (Art. 18, VI). Todas as operações são registradas em
            log de auditoria.
          </div>

          <PrivacidadeClient initialUsers={users} />
        </div>
      </div>
    </>
  )
}
