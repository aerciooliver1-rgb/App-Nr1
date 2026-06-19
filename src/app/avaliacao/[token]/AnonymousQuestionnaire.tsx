'use client'

import { useState, useTransition } from 'react'
import { QuestionnaireForm } from '@/components/features/QuestionnaireForm'
import { submitAnonymousAnswers } from '@/app/actions/assessments'
import type { AnswerInput } from '@/app/actions/assessments'

type Phase = 'consent' | 'questionnaire' | 'done' | 'error'

interface Props {
  token: string
  assessmentId: string
}

export function AnonymousQuestionnaire({ token, assessmentId }: Props) {
  const [phase, setPhase] = useState<Phase>('consent')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(answers: AnswerInput[]) {
    startTransition(async () => {
      const result = await submitAnonymousAnswers(token, answers)
      if (result?.error) {
        setErrorMsg(result.error)
        setPhase('error')
      } else {
        // Limpa dados locais (LGPD)
        try {
          sessionStorage.clear()
          localStorage.removeItem(`survey_${assessmentId}`)
        } catch {}
        setPhase('done')
      }
    })
  }

  if (phase === 'consent') {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="mb-2 font-semibold text-green-900">Suas respostas são totalmente anônimas</h2>
          <p className="text-sm text-green-800">
            O sistema <strong>não coleta</strong> seu nome, e-mail, CPF, matrícula ou qualquer dado pessoal.
            Somente as médias agregadas do setor serão analisadas — nunca respostas individuais.
          </p>
        </div>

        <h3 className="mb-3 font-semibold text-gray-900">Sobre este questionário</h3>
        <ul className="mb-6 flex flex-col gap-2 text-sm text-gray-600">
          <li>• São 13 fatores de risco psicossocial com questões de múltipla escolha.</li>
          <li>• Cada resposta usa uma escala de 1 a 5 (concordância, frequência ou existência).</li>
          <li>• Responda com base na sua <strong>experiência real no trabalho</strong>.</li>
          <li>• Se fechar o navegador antes de concluir, as respostas não serão salvas.</li>
        </ul>

        <button
          onClick={() => setPhase('questionnaire')}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Entendi e quero responder →
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Obrigado pela participação!</h2>
        <p className="text-sm text-gray-500">
          Suas respostas foram registradas de forma anônima e contribuirão para a melhoria das condições de trabalho no seu setor.
        </p>
        <p className="mt-4 text-xs text-gray-400">Você já pode fechar esta página.</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 font-semibold text-red-900">Não foi possível registrar suas respostas</h2>
        <p className="mb-4 text-sm text-red-700">{errorMsg}</p>
        <button
          onClick={() => setPhase('questionnaire')}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <QuestionnaireForm
        assessmentId={assessmentId}
        mode="B"
        showAnonymityReminder
        onSubmit={async (answers) => handleSubmit(answers)}
      />
    </div>
  )
}
