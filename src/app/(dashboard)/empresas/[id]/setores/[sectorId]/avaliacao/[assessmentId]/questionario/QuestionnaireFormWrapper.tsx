'use client'

import { useState } from 'react'
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
  respondentIndex: number
  managersTotal: number
  managerName: string | null
}

export function QuestionnaireFormWrapper({
  assessmentId,
  companyId,
  sectorId,
  existingAnswers,
  existingNotes,
  respondentIndex,
  managersTotal,
  managerName,
}: Props) {
  const router = useRouter()
  const [pendingNotice, setPendingNotice] = useState<string | null>(null)

  async function handleSaveFactor(answers: AnswerInput[], note?: string) {
    return saveFactorAnswers(assessmentId, answers, note, respondentIndex)
  }

  async function handleSubmit(answers: AnswerInput[], notes: Record<string, string>) {
    const byFactor = new Map<string, AnswerInput[]>()
    for (const a of answers) {
      if (!byFactor.has(a.factorId)) byFactor.set(a.factorId, [])
      byFactor.get(a.factorId)!.push(a)
    }
    for (const [factorId, factorAnswers] of byFactor) {
      await saveFactorAnswers(assessmentId, factorAnswers, notes[factorId], respondentIndex)
    }
    const result = await submitAssessment(assessmentId, companyId, sectorId)
    if (result?.pending) {
      setPendingNotice(
        `Resposta registrada (${result.pending.responded} de ${result.pending.total} gestores). ` +
        'Aplique o questionário ao próximo gestor responsável para concluir o cálculo.',
      )
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {managersTotal > 1 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-semibold">Respondente atual: gestor {Math.min(respondentIndex, managersTotal)} de {managersTotal}</p>
          {managerName && (
            <p className="mt-0.5 text-xs text-blue-700">
              Gerentes responsáveis do setor: {managerName}. O resultado é calculado quando todos responderem.
            </p>
          )}
        </div>
      )}

      {pendingNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {pendingNotice}
        </div>
      )}

      <QuestionnaireForm
        key={respondentIndex}
        assessmentId={assessmentId}
        mode="A"
        isAdmin
        initialAnswers={existingAnswers}
        initialNotes={existingNotes}
        onSaveFactor={handleSaveFactor}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
