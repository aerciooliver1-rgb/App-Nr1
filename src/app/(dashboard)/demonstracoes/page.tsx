import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MarcarContatadoButton } from './MarcarContatadoButton'

interface DemoRequestRow {
  id: string
  full_name: string
  email: string
  whatsapp: string
  created_at: string | null
  contacted_at: string | null
}

async function getSolicitacoes(): Promise<DemoRequestRow[]> {
  const serviceClient = await createServiceClient()
  const { data } = await serviceClient
    .from('demo_requests')
    .select('id, full_name, email, whatsapp, created_at, contacted_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function DemonstracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') {
    return (
      <>
        <Header title="Demonstrações" />
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

  const solicitacoes = await getSolicitacoes()

  return (
    <>
      <Header title="Demonstrações" />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
            Pedidos de demonstração enviados pelo botão &quot;Solicitar demonstração&quot; no site.
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Recebido em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitacoes.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.email}</td>
                    <td className="px-4 py-3 text-gray-700">{s.whatsapp}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MarcarContatadoButton id={s.id} contatado={!!s.contacted_at} />
                    </td>
                  </tr>
                ))}
                {solicitacoes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhuma solicitação recebida ainda.
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
