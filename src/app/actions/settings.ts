'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateCNPJ } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type SettingsFormState = {
  error?: string
  success?: boolean
  errors?: Record<string, string[]>
} | undefined

// ─── Atualizar nome de exibição ───────────────────────────────────────────────

export async function updateProfile(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Informe o nome.' }

  const registry = (formData.get('registro_profissional') as string | null)?.trim() ?? null

  const [authResult, profileResult] = await Promise.all([
    supabase.auth.updateUser({ data: { name } }),
    supabase
      .from('profiles')
      .update({ full_name: name, registro_profissional: registry || null })
      .eq('id', user.id),
  ])

  if (authResult.error) return { error: authResult.error.message }
  if (profileResult.error) return { error: profileResult.error.message }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, {
    message: 'Senhas não coincidem',
    path: ['confirm'],
  })

export async function updatePassword(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const supabase = await createClient()

  const validated = passwordSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { error } = await supabase.auth.updateUser({ password: validated.data.password })
  if (error) return { error: error.message }

  return { success: true }
}

// ─── Atualizar dados da empresa ───────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cnpj: z.string().refine(validateCNPJ, { message: 'CNPJ inválido' }),
  economic_sector: z.string().optional(),
  size: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})

export async function registerCompany(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('account_id').eq('id', user.id).single()
  if (!profile?.account_id) return { error: 'Conta não encontrada para este usuário.' }

  const validated = companySchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('companies')
    .insert({ ...validated.data, created_by: user.id, account_id: profile.account_id })

  if (error) {
    if (error.code === '23505') return { error: 'Este CNPJ já está cadastrado.' }
    return { error: 'Erro ao cadastrar empresa. A RLS pode estar restringindo — apenas admin/colaborador podem cadastrar.' }
  }

  revalidatePath('/configuracoes')
  revalidatePath('/empresas')
  return { success: true }
}

export async function updateCompany(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const companyId = formData.get('company_id') as string
  const validated = companySchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  // A RLS restringe a edição a admin/superadmin da própria conta; `.select()`
  // detecta silenciosamente uma tentativa sem permissão (0 linhas afetadas).
  const { data, error } = await supabase
    .from('companies')
    .update(validated.data)
    .eq('id', companyId)
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') return { error: 'Este CNPJ já está cadastrado em outra empresa.' }
    return { error: 'Erro ao atualizar empresa.' }
  }
  if (!data) return { error: 'Você não tem permissão para editar esta empresa.' }

  revalidatePath('/configuracoes')
  revalidatePath('/empresas')
  return { success: true }
}

// ─── Upload de logo da empresa ────────────────────────────────────────────────

export async function uploadCompanyLogo(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const companyId = formData.get('company_id') as string
  const file = formData.get('logo') as File

  if (!file || file.size === 0) return { error: 'Selecione uma imagem.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 2 MB.' }
  if (!file.type.startsWith('image/')) return { error: 'Arquivo deve ser uma imagem (JPG, PNG ou SVG).' }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `companies/${companyId}/logo.${ext}`

  const serviceClient = await createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return {
      error: `Erro no upload: ${uploadError.message}. Certifique-se de criar o bucket "logos" no Supabase Storage (público).`,
    }
  }

  const { data: { publicUrl } } = serviceClient.storage.from('logos').getPublicUrl(path)

  const { data: updated, error: updateError } = await supabase
    .from('companies')
    .update({ logo_url: publicUrl })
    .eq('id', companyId)
    .select('id')
    .maybeSingle()

  if (updateError) return { error: 'Upload feito, mas erro ao salvar URL.' }
  if (!updated) return { error: 'Você não tem permissão para editar esta empresa.' }

  revalidatePath('/configuracoes')
  revalidatePath('/empresas')
  return { success: true }
}
