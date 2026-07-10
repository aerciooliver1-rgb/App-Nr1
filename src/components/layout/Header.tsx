'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Header({ title }: { title?: string }) {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // getSession lê a sessão local (sem chamada de rede) — evita "Failed to
    // fetch" quando a aba acorda de suspensão ou a rede oscila
    supabase.auth
      .getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null))
      .catch(() => {})
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{email}</span>
        {email && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {email.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
