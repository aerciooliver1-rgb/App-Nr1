'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { startImpersonation } from '@/app/actions/impersonation'
import type { ImpersonationState } from '@/lib/impersonation'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? 'Entrando…' : 'Entrar como'}
    </button>
  )
}

export function EntrarComoButton({ accountId }: { accountId: string }) {
  const [state, action] = useActionState<ImpersonationState, FormData>(
    startImpersonation.bind(null, accountId),
    undefined,
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <SubmitButton />
      </form>
      {state?.error && <p className="max-w-[160px] text-right text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
