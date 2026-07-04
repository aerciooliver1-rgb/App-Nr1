'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { recoverPassword } from '@/app/actions/auth'

function SendButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Enviar link'}
    </button>
  )
}

export default function RecoverPasswordPage() {
  const [state, action] = useActionState(recoverPassword, undefined)

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-400">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">E-mail enviado</h2>
        <p className="text-sm text-slate-400">{state.message}</p>
        <Link href="/login" className="mt-6 block text-sm text-blue-400 hover:text-blue-300">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Recuperar senha</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      {state?.message && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email"
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com.br"
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {state?.errors?.email?.[0] && (
            <p className="text-xs text-red-400">{state.errors.email[0]}</p>
          )}
        </div>

        <SendButton />
      </form>

      <Link href="/login" className="mt-5 block text-center text-sm text-slate-500 hover:text-slate-300">
        Voltar para o login
      </Link>
    </>
  )
}
