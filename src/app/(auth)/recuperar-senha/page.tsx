'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { recoverPassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'

export default function RecoverPasswordPage() {
  const [state, action] = useActionState(recoverPassword, undefined)

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="mb-4 text-3xl">✉️</div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">E-mail enviado</h2>
        <p className="text-sm text-gray-500">{state.message}</p>
        <Link href="/login" className="mt-6 block text-sm text-blue-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Recuperar senha</h2>
      <p className="mb-6 text-sm text-gray-500">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

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
          required
          error={state?.errors?.email?.[0]}
        />
        <SubmitButton className="w-full justify-center">Enviar link</SubmitButton>
      </form>

      <Link href="/login" className="mt-4 block text-center text-sm text-gray-500 hover:underline">
        Voltar para o login
      </Link>
    </>
  )
}
