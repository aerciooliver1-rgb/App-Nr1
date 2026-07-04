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

        {/* O que você vai responder */}
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          Diagnóstico de Riscos Psicossociais do seu setor
        </h2>
        <p className="mb-5 text-sm text-gray-600">
          Você foi convidado(a) a participar da avaliação de riscos psicossociais
          do ambiente de trabalho, prevista na <strong>NR-1</strong> (Portaria MTE
          nº 1.419/2024). Suas respostas ajudam a identificar fatores como
          sobrecarga, assédio, falta de apoio e clareza de função — e orientam
          ações concretas de melhoria no seu setor.
        </p>

        <ul className="mb-6 flex flex-col gap-2 text-sm text-gray-600">
          <li>• <strong>13 fatores</strong> de risco psicossocial, em questões de múltipla escolha.</li>
          <li>• Escala de 1 a 5 (concordância, frequência ou existência) — leva cerca de <strong>10 minutos</strong>.</li>
          <li>• Responda com base na sua <strong>experiência real no trabalho</strong>, sem certo ou errado.</li>
          <li>• Se fechar o navegador antes de concluir, nada será salvo.</li>
        </ul>

        {/* Ênfase legal no anonimato */}
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-700">
              <path d="M10 2l6 2.5V9c0 4.1-2.6 7.2-6 8.5C6.6 16.2 4 13.1 4 9V4.5L10 2z" />
              <path d="M7.5 9.8l1.8 1.8 3.2-3.6" />
            </svg>
            <h3 className="font-semibold text-green-900">Anonimato garantido por lei</h3>
          </div>
          <p className="mb-2 text-sm text-green-800">
            Esta avaliação é <strong>100% anônima</strong>: o sistema não coleta nome,
            e-mail, CPF, matrícula, IP ou qualquer dado que identifique você. Não é
            necessário login.
          </p>
          <ul className="flex flex-col gap-1 text-xs text-green-800">
            <li>• <strong>LGPD (Lei nº 13.709/2018):</strong> nenhum dado pessoal é tratado nesta coleta.</li>
            <li>• <strong>NR-1 · Portaria MTE nº 1.419/2024:</strong> a avaliação psicossocial deve preservar a identidade do trabalhador.</li>
            <li>• <strong>ISO 45003:2021:</strong> os resultados só são calculados com no mínimo 5 respondentes, impedindo a identificação individual.</li>
            <li>• Somente as <strong>médias agregadas do setor</strong> são analisadas — nunca respostas individuais.</li>
          </ul>
        </div>

        <button
          onClick={() => setPhase('questionnaire')}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white hover:bg-blue-700"
        >
          Iniciar Avaliação
        </button>
        <p className="mt-3 text-center text-xs text-gray-400">
          Ao iniciar, você declara estar ciente de que a participação é voluntária e anônima.
        </p>
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
