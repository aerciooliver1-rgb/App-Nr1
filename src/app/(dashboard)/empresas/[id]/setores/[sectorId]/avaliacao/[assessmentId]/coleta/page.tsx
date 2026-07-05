import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ColetaPanel } from './ColetaPanel'
import { TOTAL_QUESTIONS } from '@/lib/data/questions'

async function getColetaData(assessmentId: string) {
  const supabase = await createClient()

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, mode, status, sector_id, sectors(name, employee_count)')
    .eq('id', assessmentId)
    .single()

  if (!assessment || assessment.mode !== 'B') return null

  const { data: tokenRow } = await supabase
    .from('assessment_tokens')
    .select('id, token, expires_at, status')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { count: totalAnswers } = await supabase
    .from('assessment_answers')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)

  const respondents = Math.floor((totalAnswers ?? 0) / TOTAL_QUESTIONS)

  return { assessment, tokenRow, respondents }
}

export default async function ColetaPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const data = await getColetaData(assessmentId)
  if (!data) notFound()

  const { assessment, tokenRow, respondents } = data
  const sector = assessment.sectors as { name: string; employee_count: number } | null
  // O link de coleta é público por natureza: colaboradores acessam de qualquer
  // dispositivo. Sempre que a URL pública estiver configurada, o QR aponta para
  // ela — mesmo navegando pelo ambiente local (o banco é o mesmo).
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  let appUrl: string
  if (publicUrl && !publicUrl.includes('localhost')) {
    appUrl = publicUrl.replace(/\/$/, '')
  } else {
    const h = await headers()
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const host = h.get('host') ?? 'localhost:3000'
    appUrl = `${proto}://${host}`
  }
  const surveyUrl = tokenRow ? `${appUrl}/avaliacao/${tokenRow.token}` : null

  return (
    <>
      <Header title={`Coleta — ${sector?.name ?? 'Setor'}`} />
      <div className="p-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <ColetaPanel
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            surveyUrl={surveyUrl ?? ''}
            tokenId={tokenRow?.id ?? ''}
            tokenStatus={tokenRow?.status ?? 'ativo'}
            expiresAt={tokenRow?.expires_at ?? ''}
            totalEmployees={sector?.employee_count ?? 0}
            initialRespondents={respondents}
            assessmentStatus={assessment.status}
          />
        </div>
      </div>
    </>
  )
}
