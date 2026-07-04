'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/actions/auth'

function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? 'Entrando…' : 'Entrar'}
      {!pending && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      )}
    </button>
  )
}

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined)

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Entrar na plataforma</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Acesso exclusivo a profissionais habilitados
        </p>
      </div>

      {state?.message && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">

        {/* E-mail */}
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
            autoComplete="email"
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {state?.errors?.email?.[0] && (
            <p className="text-xs text-red-400">{state.errors.email[0]}</p>
          )}
        </div>

        {/* Senha */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password"
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {state?.errors?.password?.[0] && (
            <p className="text-xs text-red-400">{state.errors.password[0]}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/recuperar-senha"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Esqueci minha senha
          </Link>
        </div>

        <LoginButton />

      </form>
    </>
  )
}
