import { createClient } from '@/lib/supabase/server'
import { NovaAvaliacaoClient } from './NovaAvaliacaoClient'

async function getQuota(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', userId).single()
  const accountId = profile?.account_id
  if (!accountId) return { monthlyLimit: 10, usedThisMonth: 0 }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: sub }, { data: teamMembers }] = await Promise.all([
    supabase.from('subscriptions').select('assessments_monthly_limit').eq('account_id', accountId).maybeSingle(),
    supabase.from('profiles').select('id').eq('account_id', accountId),
  ])

  const memberIds = (teamMembers ?? []).map(p => p.id)
  const { count: used } = memberIds.length
    ? await supabase.from('assessments').select('id', { count: 'exact', head: true })
        .in('created_by', memberIds)
        .gte('created_at', monthStart.toISOString())
    : { count: 0 }

  return {
    monthlyLimit: sub?.assessments_monthly_limit ?? 10,
    usedThisMonth: used ?? 0,
  }
}

export default async function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const quota = user ? await getQuota(user.id) : { monthlyLimit: 10, usedThisMonth: 0 }

  return (
    <NovaAvaliacaoClient
      params={params}
      usedThisMonth={quota.usedThisMonth}
      monthlyLimit={quota.monthlyLimit}
    />
  )
}
