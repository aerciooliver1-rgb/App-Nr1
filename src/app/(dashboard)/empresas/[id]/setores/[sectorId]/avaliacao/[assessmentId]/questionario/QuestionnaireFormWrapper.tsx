'use client'

import { useRouter } from 'next/navigation'
import { QuestionnaireForm } from '@/components/features/QuestionnaireForm'
import { saveFactorAnswers, submitAssessment } from '@/app/actions/assessments'
import type { AnswerInput } from '@/app/actions/assessments'

interface Props {
  assessmentId: string
  companyId: string
  sectorId: string
  existingAnswers: Record<string, number>
  existingNotes: Record<string, string>
}

export function QuestionnaireFormWrapper({
  assessmentId,
  companyId,
  sectorId,
  existingAnswers,
  existingNotes,
}: Props) {
  const router = useRouter()

  async function handleSaveFactor(answers: AnswerInput[], note?: string) {
    return saveFactorAnswers(assessmentId, answers, note)
  }

  async function handleSubmit(answers: AnswerInput[], notes: Record<string, string>) {
    const byFactor = new Map<string, AnswerInput[]>()
    for (const a of answers) {
      if (!byFactor.has(a.factorId)) byFactor.set(a.factorId, [])
      byFactor.get(a.factorId)!.push(a)
    }
    for (const [factorId, factorAnswers] of byFactor) {
      await saveFactorAnswers(assessmentId, factorAnswers, notes[factorId])
    }
    await submitAssessment(assessmentId, companyId, sectorId)
  }

  return (
    <QuestionnaireForm
      assessmentId={assessmentId}
      mode="A"
      isAdmin
      initialAnswers={existingAnswers}
      initialNotes={existingNotes}
      onSaveFactor={handleSaveFactor}
      onSubmit={handleSubmit}
    />
  )
}
