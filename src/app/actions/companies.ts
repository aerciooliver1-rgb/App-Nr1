'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { validateCNPJ } from '@/lib/utils'

const companySchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres' }),
  cnpj: z.string().refine(validateCNPJ, { message: 'CNPJ inválido' }),
  economic_sector: z.string().optional(),
  size: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
})

const sectorSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres' }),
  employee_count: z.coerce.number().int().min(1, { message: 'Informe ao menos 1 funcionário' }),
})

export type CompanyState = {
  errors?: Record<string, string[]>
  message?: string
} | undefined

export async function createCompany(state: CompanyState, formData: FormData): Promise<CompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = companySchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { data, error } = await supabase
    .from('companies')
    .insert({ ...validated.data, created_by: user.id })
    .select('id')
    .single()

  if (error) return { message: 'Erro ao cadastrar empresa. Verifique se o CNPJ já está cadastrado.' }

  revalidatePath('/empresas')
  redirect(`/empresas/${data.id}`)
}

export async function updateCompany(id: string, state: CompanyState, formData: FormData): Promise<CompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = companySchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { error } = await supabase.from('companies').update(validated.data).eq('id', id)
  if (error) return { message: 'Erro ao atualizar empresa.' }

  revalidatePath(`/empresas/${id}`)
  return { message: 'Empresa atualizada com sucesso.' }
}

export async function createSector(companyId: string, state: CompanyState, formData: FormData): Promise<CompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = sectorSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('sectors')
    .insert({ ...validated.data, company_id: companyId, created_by: user.id })

  if (error) return { message: 'Erro ao cadastrar setor.' }

  revalidatePath(`/empresas/${companyId}`)
  redirect(`/empresas/${companyId}`)
}

export async function updateSector(id: string, companyId: string, state: CompanyState, formData: FormData): Promise<CompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const validated = sectorSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { error } = await supabase.from('sectors').update(validated.data).eq('id', id)
  if (error) return { message: 'Erro ao atualizar setor.' }

  revalidatePath(`/empresas/${companyId}`)
  redirect(`/empresas/${companyId}`)
}
