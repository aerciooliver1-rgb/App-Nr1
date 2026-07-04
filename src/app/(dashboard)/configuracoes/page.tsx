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

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: profile }, { data: companies }, users, { data: subscription }, { count: assessmentsThisMonth }] = await Promise.all([
    supabase.from('profiles').select('role, full_name, registro_profissional').eq('id', user.id).single(),
    supabase.from('companies').select('id, name, logo_url').eq('created_by', user.id).order('name'),
    listUsers(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('assessments').select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gte('created_at', monthStart.toISOString()),
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
    isAdmin: profile?.role === 'admin',
    users,
    subscription: subscription ?? null,
    assessmentsThisMonth: assessmentsThisMonth ?? 0,
  }
}

export interface CompanyOption {
  id: string
  name: string
  logo_url: string | null
}

export interface SubscriptionData {
  plan_type: string
  status: string
  assessments_monthly_limit: number
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
                assessmentsThisMonth={data.assessmentsThisMonth}
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
