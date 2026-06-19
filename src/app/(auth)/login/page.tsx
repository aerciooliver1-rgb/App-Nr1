'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined)

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Entrar</h2>

      {state?.message && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
          error={state?.errors?.email?.[0]}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={state?.errors?.password?.[0]}
        />

        <div className="flex justify-end">
          <Link href="/recuperar-senha" className="text-sm text-blue-600 hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <SubmitButton className="w-full justify-center">Entrar</SubmitButton>
      </form>
    </>
  )
}
