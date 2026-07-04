'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { resetPassword } from '@/app/actions/auth'

function ResetButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? 'Redefinindo…' : 'Redefinir senha'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [state, action] = useActionState(resetPassword, undefined)

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Nova senha</h2>
        <p className="mt-1.5 text-sm text-slate-400">Escolha uma nova senha para sua conta.</p>
      </div>

      {state?.message && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password"
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Nova senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {state?.errors?.password?.[0] && (
            <p className="text-xs text-red-400">{state.errors.password[0]}</p>
          )}
        </div>

        <ResetButton />
      </form>
    </>
  )
}
