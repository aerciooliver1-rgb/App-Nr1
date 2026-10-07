'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, getAccountContext } from '@/lib/supabase/server'

/** Marca/desmarca uma solicitação de demonstração (vinda da landing page)
 *  como contatada. Lê/escreve sempre pela service role — a tabela não tem
 *  policy de SELECT para ninguém (ver migration 026_demo_requests.sql). */
export async function marcarContatado(id: string, contatado: boolean): Promise<{ error?: string }> {
  const ctx = await getAccountContext()
  if (!ctx || !ctx.isSuperadmin) return { error: 'Não autorizado.' }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient
    .from('demo_requests')
    .update({ contacted_at: contatado ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) return { error: 'Erro ao atualizar.' }

  revalidatePath('/demonstracoes')
  return {}
}
