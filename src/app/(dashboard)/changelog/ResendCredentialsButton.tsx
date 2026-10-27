'use client'

import { useState, useTransition } from 'react'
import { resendWelcomeCredentials } from '@/app/actions/hotmartOnboarding'

export function ResendCredentialsButton({ logId }: { logId: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function enviar() {
    setErro(null)
    startTransition(async () => {
      const result = await resendWelcomeCredentials(logId)
      if (result.error) setErro(result.error)
      else setDone(true)
    })
  }

  if (done) {
    return <span className="text-xs font-medium text-emerald-600">Credenciais reenviadas ✓</span>
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Reenviar credenciais'}
      </button>
      {erro && <p className="max-w-[200px] text-xs text-red-600">{erro}</p>}
    </div>
  )
}
