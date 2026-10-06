import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const LIMITE = 300

interface EventoRow {
  id: string
  created_at: string | null
  action: string
  table_name: string | null
  accountName: string
  userName: string
}

async function getEventos(): Promise<EventoRow[]> {
  const serviceClient = await createServiceClient()

  const { data: logs } = await serviceClient
    .from('audit_logs')
    .select('id, action, table_name, user_id, account_id, created_at')
    .order('created_at', { ascending: false })
    .limit(LIMITE)

  const userIds = [...new Set((logs ?? []).map(l => l.user_id).filter((id): id is string => !!id))]
  const accountIds = [...new Set((logs ?? []).map(l => l.account_id).filter((id): id is string => !!id))]

  const [{ data: profiles }, { data: accounts }] = await Promise.all([
    userIds.length
      ? serviceClient.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    accountIds.length
      ? serviceClient.from('accounts').select('id, owner_id').in('id', accountIds)
      : Promise.resolve({ data: [] as { id: string; owner_id: string | null }[] }),
  ])

  const nomeDoPerfil = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? '—']))
  const donoDaConta = new Map((accounts ?? []).map(a => [a.id, a.owner_id ? nomeDoPerfil.get(a.owner_id) ?? '—' : '—']))

  return (logs ?? []).map(l => ({
    id: l.id,
    created_at: l.created_at,
    action: l.action,
    table_name: l.table_name,
    accountName: l.account_id ? donoDaConta.get(l.account_id) ?? '—' : 'Plataforma',
    userName: l.user_id ? nomeDoPerfil.get(l.user_id) ?? '—' : 'Sistema',
  }))
}

export default async function ChangelogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <Header title="Changelog" />
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

  const eventos = await getEventos()

  return (
    <>
      <Header title="Changelog" />
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Log de eventos da plataforma para controle. Não exibe o conteúdo dos cadastros dos clientes
            (empresas, setores, avaliações); para ver a tela de um cliente use &quot;Entrar como&quot; em Contas.
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Tabela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventos.map(e => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                      {e.created_at
                        ? new Date(e.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="max-w-md break-words px-4 py-3 font-mono text-xs text-gray-700">{e.action}</td>
                    <td className="px-4 py-3 text-gray-700">{e.accountName}</td>
                    <td className="px-4 py-3 text-gray-700">{e.userName}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.table_name ?? '—'}</td>
                  </tr>
                ))}
                {eventos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhum evento registrado ainda.
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
