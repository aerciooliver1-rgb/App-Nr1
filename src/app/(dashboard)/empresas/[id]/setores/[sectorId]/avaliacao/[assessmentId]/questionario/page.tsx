import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { countManagers, TOTAL_QUESTIONS } from '@/lib/calculations/risk'
import { QuestionnaireFormWrapper } from './QuestionnaireFormWrapper'

async function getAssessment(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessments')
    .select('id, mode, status, sector_id, sectors(name, manager_name, company_id:companies(id))')
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

  // Modo A: um respondente por gerente responsável do setor
  const managerName = assessment.sectors?.manager_name ?? null
  const managersTotal = countManagers(managerName)

  const { data: existing } = await supabase
    .from('assessment_answers')
    .select('question_id, score, clinical_note, respondent_index')
    .eq('assessment_id', assessmentId)

  // Respondente atual = primeiro índice ainda sem o questionário completo
  const countByIndex = new Map<number, number>()
  for (const row of existing ?? []) {
    countByIndex.set(row.respondent_index, (countByIndex.get(row.respondent_index) ?? 0) + 1)
  }
  let respondentIndex = 1
  while ((countByIndex.get(respondentIndex) ?? 0) >= TOTAL_QUESTIONS) {
    respondentIndex += 1
  }

  // Retomada: apenas as respostas do respondente atual
  const existingAnswers: Record<string, number> = {}
  const existingNotes: Record<string, string> = {}
  for (const row of existing ?? []) {
    if (row.respondent_index !== respondentIndex) continue
    existingAnswers[row.question_id] = row.score
    if (row.clinical_note) {
      const factorId = row.question_id.slice(0, 3)
      existingNotes[factorId] = row.clinical_note
    }
  }

  return (
    <>
      <Header title="Questionário — Modo A (Gestores)" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl">
          <QuestionnaireFormWrapper
            assessmentId={assessmentId}
            companyId={id}
            sectorId={sectorId}
            existingAnswers={existingAnswers}
            existingNotes={existingNotes}
            respondentIndex={respondentIndex}
            managersTotal={managersTotal}
            managerName={managerName}
          />
        </div>
      </div>
    </>
  )
}
