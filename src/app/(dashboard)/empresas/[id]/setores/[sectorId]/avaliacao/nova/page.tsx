import { createClient } from '@/lib/supabase/server'
import { NovaAvaliacaoClient } from './NovaAvaliacaoClient'

async function getQuota(userId: string) {
  const supabase = await createClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: sub }, { count: used }] = await Promise.all([
    supabase.from('subscriptions').select('assessments_monthly_limit').eq('user_id', userId).maybeSingle(),
    supabase.from('assessments').select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', monthStart.toISOString()),
  ])

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
