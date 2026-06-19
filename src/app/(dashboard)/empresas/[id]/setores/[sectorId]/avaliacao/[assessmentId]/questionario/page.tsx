import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { QuestionnaireFormWrapper } from './QuestionnaireFormWrapper'

async function getAssessment(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessments')
    .select('id, mode, status, sector_id, sectors(name, company_id:companies(id))')
    .eq('id', id)
    .single()
  return data
}

export default async function QuestionarioPage({
  params,
}: {
  params: Promise<{ id: string; sectorId: string; assessmentId: string }>
}) {
  const { id, sectorId, assessmentId } = await params
  const assessment = await getAssessment(assessmentId)

  if (!assessment || assessment.mode !== 'A') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Carrega respostas existentes (para retomada)
  const { data: existing } = await supabase
    .from('assessment_answers')
    .select('question_id, score, clinical_note')
    .eq('assessment_id', assessmentId)

  const existingAnswers: Record<string, number> = {}
  const existingNotes: Record<string, string> = {}

  for (const row of existing ?? []) {
    existingAnswers[row.question_id] = row.score
    if (row.clinical_note) {
      const factorId = row.question_id.slice(0, 3)
      existingNotes[factorId] = row.clinical_note
    }
  }

  return (
    <>
      <Header title="Questionário — Modo A" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl">
          <QuestionnaireFormWrapper
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            existingAnswers={existingAnswers}
            existingNotes={existingNotes}
          />
        </div>
      </div>
    </>
  )
}
