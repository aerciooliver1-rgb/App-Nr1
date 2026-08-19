import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { EntrarComoButton } from './EntrarComoButton'

interface AccountRow {
  id: string
  ownerName: string
  ownerEmail: string
  isSuperadminAccount: boolean
  companiesCount: number
  membersCount: number
  planType: string
  planStatus: string
  createdAt: string | null
}

async function getAccounts(): Promise<AccountRow[]> {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const [{ data: accounts }, { data: profiles }, { data: companies }, { data: subscriptions }] = await Promise.all([
    supabase.from('accounts').select('id, owner_id, created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role, account_id'),
    supabase.from('companies').select('id, account_id'),
    supabase.from('subscriptions').select('account_id, plan_type, status'),
  ])

  const { data: authUsersPage } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const emailByUserId = new Map((authUsersPage?.users ?? []).map(u => [u.id, u.email ?? '—']))

  return (accounts ?? []).map(acc => {
    const members = (profiles ?? []).filter(p => p.account_id === acc.id)
    const owner = members.find(p => p.id === acc.owner_id) ?? members[0]
    const sub = (subscriptions ?? []).find(s => s.account_id === acc.id)

    return {
      id: acc.id,
      ownerName: owner?.full_name ?? '—',
      ownerEmail: acc.owner_id ? (emailByUserId.get(acc.owner_id) ?? '—') : '—',
      isSuperadminAccount: members.some(m => m.role === 'superadmin'),
      companiesCount: (companies ?? []).filter(c => c.account_id === acc.id).length,
      membersCount: members.length,
      planType: sub?.plan_type ?? 'trial',
      planStatus: sub?.status ?? 'trial',
      createdAt: acc.created_at,
    }
  })
}

export default async function ContasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <Header title="Contas" />
        <div className="flex h-[60vh] items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Acesso restrito</p>
            <p className="mt-1 text-xs text-gray-400">
              Apenas a administração da plataforma acessa esta área.
            </p>
          </div>
        </div>
      </>
    )
  }

  const accounts = (await getAccounts()).filter(a => !a.isSuperadminAccount)

  return (
    <>
      <Header title="Contas" />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Área de suporte — &quot;Entrar como&quot; abre uma sessão real na conta do cliente (leitura e escrita),
            até você clicar em &quot;Voltar para minha conta&quot;. Início e fim ficam registrados em auditoria.
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Empresas</th>
                  <th className="px-4 py-3">Usuários</th>
                  <th className="px-4 py-3">Criada em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map(acc => (
                  <tr key={acc.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{acc.ownerName}</p>
                      <p className="text-xs text-gray-400">{acc.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {acc.planType} <span className="text-xs text-gray-400">({acc.planStatus})</span>
                    </td>
                    <td className="px-4 py-3">{acc.companiesCount}</td>
                    <td className="px-4 py-3">{acc.membersCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EntrarComoButton accountId={acc.id} />
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhum cliente cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
