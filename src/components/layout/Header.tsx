import { createClient } from '@/lib/supabase/server'

export async function Header({ title }: { title?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
