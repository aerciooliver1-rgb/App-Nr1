'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter ao menos 6 caracteres' }),
})

const emailSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
})

const resetSchema = z.object({
  password: z.string().min(6, { message: 'Senha deve ter ao menos 6 caracteres' }),
})

export type AuthState = {
  errors?: Record<string, string[]>
  message?: string
  success?: boolean
} | undefined

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    return { message: 'E-mail ou senha incorretos.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function recoverPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = emailSchema.safeParse({ email: formData.get('email') })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  })

  if (error) {
    return { message: 'Não foi possível enviar o e-mail. Tente novamente.' }
  }

  return { success: true, message: 'E-mail enviado! Verifique sua caixa de entrada.' }
}

export async function resetPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = resetSchema.safeParse({ password: formData.get('password') })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: validated.data.password })

  if (error) {
    return { message: 'Não foi possível redefinir a senha. O link pode ter expirado.' }
  }

  redirect('/dashboard')
}
