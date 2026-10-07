import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const LIMITE = 500

interface EventoRow {
  id: string
  created_at: string | null
  action: string
  table_name: string | null
  accountName: string
  userName: string
}

async function enriquecer(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  logs: { id: string; action: string; table_name: string | null; user_id: string | null; account_id: string | null; created_at: string | null }[],
): Promise<EventoRow[]> {
  const userIds = [...new Set(logs.map(l => l.user_id).filter((id): id is string => !!id))]
  const accountIds = [...new Set(logs.map(l => l.account_id).filter((id): id is string => !!id))]

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

  return logs.map(l => ({
    id: l.id,
    created_at: l.created_at,
    action: l.action,
    table_name: l.table_name,
    accountName: l.account_id ? donoDaConta.get(l.account_id) ?? '—' : 'Plataforma',
    userName: l.user_id ? nomeDoPerfil.get(l.user_id) ?? '—' : 'Sistema',
  }))
}

/** Usuários cujo nome ou e-mail batem com a busca — por nome (profiles.full_name)
 *  ou e-mail (auth.users), já que nem sempre quem procura lembra o nome exato. */
async function buscarUsuarios(serviceClient: Awaited<ReturnType<typeof createServiceClient>>, termo: string) {
  const termoLower = termo.toLowerCase()

  const [{ data: profiles }, { data: authUsersPage }] = await Promise.all([
    serviceClient.from('profiles').select('id, full_name'),
    serviceClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailByUserId = new Map((authUsersPage?.users ?? []).map(u => [u.id, u.email ?? '']))

  return (profiles ?? [])
    .filter(p =>
      (p.full_name ?? '').toLowerCase().includes(termoLower) ||
      (emailByUserId.get(p.id) ?? '').toLowerCase().includes(termoLower)
    )
    .map(p => ({ id: p.id, full_name: p.full_name, email: emailByUserId.get(p.id) ?? '—' }))
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; data?: string }>
}) {
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

  const sp = await searchParams
  const usuarioQuery = (sp.usuario ?? '').trim()
  const dataQuery = sp.data ?? ''

  const serviceClient = await createServiceClient()

  let usuariosEncontrados: { id: string; full_name: string | null; email: string }[] = []
  let eventos: EventoRow[] = []
  let buscou = false

  if (usuarioQuery) {
    buscou = true
    usuariosEncontrados = await buscarUsuarios(serviceClient, usuarioQuery)

    if (usuariosEncontrados.length > 0) {
      let query = serviceClient
        .from('audit_logs')
        .select('id, action, table_name, user_id, account_id, created_at')
        .in('user_id', usuariosEncontrados.map(u => u.id))
        .order('created_at', { ascending: false })
        .limit(LIMITE)

      if (dataQuery) {
        query = query.gte('created_at', new Date(`${dataQuery}T00:00:00`).toISOString())
      }

      const { data: logs } = await query
      eventos = await enriquecer(serviceClient, logs ?? [])
    }
  }

  return (
    <>
      <Header title="Changelog" />
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Log de eventos da plataforma para controle. Não exibe o conteúdo dos cadastros dos clientes
            (empresas, setores, avaliações); para ver a tela de um cliente use &quot;Entrar como&quot; em Contas.
          </div>

          <form className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Usuário (nome ou e-mail)</label>
              <input
                type="text"
                name="usuario"
                defaultValue={sp.usuario ?? ''}
                placeholder="Ex.: Aline Oliveira"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">A partir de</label>
              <input
                type="date"
                name="data"
                defaultValue={sp.data ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Buscar
            </button>
            {buscou && (
              <a href="/changelog" className="text-sm text-gray-400 hover:text-gray-600">
                Limpar
              </a>
            )}
          </form>

          {!buscou && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <p className="text-gray-400">Busque por um usuário para ver os eventos registrados.</p>
            </div>
          )}

          {buscou && usuariosEncontrados.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <p className="text-gray-400">Nenhum usuário encontrado com &quot;{usuarioQuery}&quot;.</p>
            </div>
          )}

          {buscou && usuariosEncontrados.length > 0 && (
            <>
              <p className="text-xs text-gray-400">
                {usuariosEncontrados.length === 1
                  ? <>Usuário: <span className="font-medium text-gray-600">{usuariosEncontrados[0].full_name ?? usuariosEncontrados[0].email}</span></>
                  : <>{usuariosEncontrados.length} usuários encontrados: {usuariosEncontrados.map(u => u.full_name ?? u.email).join(', ')}</>}
              </p>

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
                          Nenhum evento registrado para esse usuário{dataQuery ? ' a partir dessa data' : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
