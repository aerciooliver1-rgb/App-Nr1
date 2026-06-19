import { createServiceClient } from '@/lib/supabase/server'
import { AnonymousQuestionnaire } from './AnonymousQuestionnaire'

async function validateToken(token: string) {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('assessment_tokens')
    .select('id, assessment_id, status, expires_at, assessments(mode, status, sectors(name))')
    .eq('token', token)
    .single()

  if (!data) return { valid: false, reason: 'Link inválido.' }
  if (data.status === 'encerrado') return { valid: false, reason: 'Esta avaliação foi encerrada.' }
  if (data.status === 'expirado' || new Date(data.expires_at) < new Date())
    return { valid: false, reason: 'Este link expirou.' }

  const assessment = data.assessments as { mode: string; status: string; sectors: { name: string } | null } | null
  if (!assessment || assessment.mode !== 'B') return { valid: false, reason: 'Link inválido.' }

  return {
    valid: true,
    assessmentId: data.assessment_id,
    sectorName: assessment.sectors?.name ?? 'Setor',
  }
}

export default async function AvaliacaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await validateToken(token)

  if (!result.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link indisponível</h1>
          <p className="text-sm text-gray-500">{result.reason}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Diagnóstico Psicossocial — NR-1</p>
          <h1 className="text-base font-semibold text-gray-900">{result.sectorName}</h1>
        </div>
      </header>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <AnonymousQuestionnaire token={token} assessmentId={result.assessmentId!} />
        </div>
      </div>
    </div>
  )
}
