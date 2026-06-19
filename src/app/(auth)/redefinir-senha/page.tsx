'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/Button'

export default function ResetPasswordPage() {
  const [state, action] = useActionState(resetPassword, undefined)

  return (
    <>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Nova senha</h2>
      <p className="mb-6 text-sm text-gray-500">Escolha uma nova senha para sua conta.</p>

      {state?.message && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="password"
          name="password"
          type="password"
          label="Nova senha"
          placeholder="Mínimo 6 caracteres"
          required
          error={state?.errors?.password?.[0]}
        />
        <SubmitButton className="w-full justify-center">Redefinir senha</SubmitButton>
      </form>
    </>
  )
}
