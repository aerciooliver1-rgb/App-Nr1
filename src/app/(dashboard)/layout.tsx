import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE } from '@/lib/impersonation'

async function getImpersonationBannerData() {
  const cookieStore = await cookies()
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value
  if (!token) return null

  const serviceClient = await createServiceClient()
  const { data: session } = await serviceClient
    .from('impersonation_sessions')
    .select('superadmin_id, target_user_id')
    .eq('token', token)
    .is('ended_at', null)
    .maybeSingle()
  if (!session) return null

  const [{ data: superadminProfile }, { data: targetProfile }] = await Promise.all([
    serviceClient.from('profiles').select('full_name').eq('id', session.superadmin_id).single(),
    serviceClient.from('profiles').select('full_name').eq('id', session.target_user_id).single(),
  ])

  return {
    superadminName: superadminProfile?.full_name ?? 'Superadmin',
    targetName: targetProfile?.full_name ?? 'cliente',
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const impersonation = await getImpersonationBannerData()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isSuperadmin={profile?.role === 'superadmin'} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {impersonation && <ImpersonationBanner {...impersonation} />}
        {children}
      </main>
    </div>
  )
}
