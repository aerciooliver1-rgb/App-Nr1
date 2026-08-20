import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ConfiguracoesClient } from './ConfiguracoesClient'
import { listUsers } from '@/app/actions/users'
import type { ManagedUser } from '@/app/actions/users'

async function getData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name, registro_profissional, account_id').eq('id', user.id).single()

  const accountId = profile?.account_id ?? null

  const [{ data: companies }, users, { data: subscription }, { data: responsesThisMonth }] = await Promise.all([
    accountId
      ? supabase
          .from('companies')
          .select('id, name, logo_url, cnpj, economic_sector, size, contact_name, contact_email')
          .eq('account_id', accountId)
          .order('name')
      : Promise.resolve({ data: [] }),
    listUsers(),
    accountId
      ? supabase.from('subscriptions').select('*').eq('account_id', accountId).maybeSingle()
      : Promise.resolve({ data: null }),
    accountId
      ? supabase.rpc('count_monthly_responses_account', { p_account_id: accountId })
      : Promise.resolve({ data: 0 }),
  ])

  const userName: string =
    profile?.full_name ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Usuário'

  return {
    user: { id: user.id, email: user.email ?? '', name: userName },
    userRegistry: profile?.registro_profissional ?? '',
    companies: companies ?? [],
    isAdmin: profile?.role === 'admin' || profile?.role === 'superadmin',
    users,
    subscription: subscription ?? null,
    responsesThisMonth: responsesThisMonth ?? 0,
  }
}

export interface CompanyOption {
  id: string
  name: string
  logo_url: string | null
  cnpj: string
  economic_sector: string | null
  size: string | null
  contact_name: string | null
  contact_email: string | null
}

export interface SubscriptionData {
  plan_type: string
  status: string
  assessments_monthly_limit: number
  responses_monthly_limit: number
  period_start: string
  period_end: string
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
            <Suspense>
              <ConfiguracoesClient
                userName={data.user.name}
                userEmail={data.user.email}
                userRegistry={data.userRegistry}
                companies={data.companies as CompanyOption[]}
                isAdmin={data.isAdmin}
                initialUsers={data.users}
                subscription={data.subscription as SubscriptionData | null}
                responsesThisMonth={data.responsesThisMonth}
              />
            </Suspense>
          ) : (
            <p className="text-sm text-gray-500">Erro ao carregar configurações.</p>
          )}
        </div>
      </div>
    </>
  )
}
