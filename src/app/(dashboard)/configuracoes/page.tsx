import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ConfiguracoesClient } from './ConfiguracoesClient'
import { listUsers } from '@/app/actions/users'
import type { ManagedUser } from '@/app/actions/users'

async function getData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: companies }, users] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('companies').select('id, name, logo_url').eq('created_by', user.id).order('name'),
    listUsers(),
  ])

  const userName: string =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Usuário'

  return {
    user: { id: user.id, email: user.email ?? '', name: userName },
    companies: companies ?? [],
    isAdmin: profile?.role === 'admin',
    users,
  }
}

export interface CompanyOption {
  id: string
  name: string
  logo_url: string | null
}

export type { ManagedUser }

export default async function ConfiguracoesPage() {
  const data = await getData()

  return (
    <>
      <Header title="Configurações" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {data ? (
            <ConfiguracoesClient
              userName={data.user.name}
              userEmail={data.user.email}
              companies={data.companies as CompanyOption[]}
              isAdmin={data.isAdmin}
              initialUsers={data.users}
            />
          ) : (
            <p className="text-sm text-gray-500">Erro ao carregar configurações.</p>
          )}
        </div>
      </div>
    </>
  )
}
