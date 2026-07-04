'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { FACTORS, SCALE_LABELS } from '@/lib/data/questions'
import type { AnswerInput } from '@/app/actions/assessments'

interface Props {
  assessmentId: string
  mode: 'A' | 'B'
  isAdmin?: boolean
  initialAnswers?: Record<string, number>
  initialNotes?: Record<string, string>
  onSaveFactor?: (answers: AnswerInput[], note?: string) => Promise<{ error?: string }>
  onSubmit: (answers: AnswerInput[], notes: Record<string, string>) => Promise<void>
  showAnonymityReminder?: boolean
}

export function QuestionnaireForm({
  assessmentId,
  mode,
  isAdmin = false,
  initialAnswers = {},
  initialNotes = {},
  onSaveFactor,
  onSubmit,
  showAnonymityReminder = false,
}: Props) {
  // Start on the first unanswered factor when resuming
  const firstUnanswered = FACTORS.findIndex(f =>
    f.questions.some(q => initialAnswers[q.id] === undefined)
  )
  const [factorIndex, setFactorIndex] = useState(firstUnanswered >= 0 ? firstUnanswered : 0)
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes)
  const [phase, setPhase] = useState<'questionnaire' | 'review'>('questionnaire')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [focusedQId, setFocusedQId] = useState<string | null>(null)
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const currentFactor = FACTORS[factorIndex]
  const totalAnswered = Object.keys(answers).length
  const totalQuestions = FACTORS.reduce((sum, f) => sum + f.questions.length, 0)

  const currentFactorComplete = currentFactor.questions.every(q => answers[q.id] !== undefined)

  // Auto-focus first unanswered question when factor changes
  useEffect(() => {
    const first = currentFactor.questions.find(q => answers[q.id] === undefined)
    setFocusedQId(first?.id ?? currentFactor.questions[0]?.id ?? null)
  }, [factorIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler: 1-5 answers focused question, advance focus
  useEffect(() => {
    if (phase !== 'questionnaire') return
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      const val = parseInt(e.key)
      if (val >= 1 && val <= 5 && focusedQId) {
        handleAnswer(focusedQId, val)
        // Focus next unanswered question
        const idx = currentFactor.questions.findIndex(q => q.id === focusedQId)
        const next = currentFactor.questions.slice(idx + 1).find(q => answers[q.id] === undefined && q.id !== focusedQId)
          ?? currentFactor.questions.slice(idx + 1)[0]
        if (next) {
          setFocusedQId(next.id)
          answerRefs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, focusedQId, currentFactor, answers]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer(questionId: string, value: number) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setError(null)
  }

  async function goToNext() {
    if (!currentFactorComplete) {
      setError('Responda todas as questões deste fator antes de continuar.')
      return
    }

    if (onSaveFactor) {
      const factorAnswers: AnswerInput[] = currentFactor.questions.map(q => ({
        questionId: q.id,
        factorId: q.factorId,
        score: answers[q.id],
      }))
      startTransition(async () => {
        const result = await onSaveFactor(factorAnswers, notes[currentFactor.id])
        if (result?.error) { setError(result.error); return }

        if (factorIndex < FACTORS.length - 1) {
          setFactorIndex(i => i + 1)
        } else {
          setPhase('review')
        }
      })
    } else {
      if (factorIndex < FACTORS.length - 1) {
        setFactorIndex(i => i + 1)
      } else {
        setPhase('review')
      }
    }
  }

  function goToPrev() {
    if (factorIndex > 0) setFactorIndex(i => i - 1)
  }

  function goToFactor(index: number) {
    setFactorIndex(index)
    setPhase('questionnaire')
  }

  function handleSubmit() {
    const allAnswered = FACTORS.every(f => f.questions.every(q => answers[q.id] !== undefined))
    if (!allAnswered) {
      setError('Há questões sem resposta. Revise antes de submeter.')
      return
    }

    const allAnswers: AnswerInput[] = FACTORS.flatMap(f =>
      f.questions.map(q => ({ questionId: q.id, factorId: q.factorId, score: answers[q.id] }))
    )

    startTransition(async () => {
      await onSubmit(allAnswers, notes)
    })
  }

  if (phase === 'review') {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          {mode === 'B'
            ? 'Suas respostas serão enviadas sem identificação. Revise antes de confirmar.'
            : 'Revise suas respostas antes de submeter.'}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {FACTORS.map((factor, i) => (
          <div key={factor.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{factor.id} — {factor.name}</h3>
              <button
                onClick={() => goToFactor(i)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Editar
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {factor.questions.map(q => {
                const val = answers[q.id]
                const label = val ? SCALE_LABELS[q.scale][val - 1] : '—'
                return (
                  <div key={q.id} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-600">{q.text}</span>
                    <span className="shrink-0 font-medium text-gray-900">{val} — {label}</span>
                  </div>
                )
              })}
              {isAdmin && notes[factor.id] && (
                <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                  <span className="font-medium">Nota clínica:</span> {notes[factor.id]}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Enviando…' : mode === 'B' ? 'Confirmar envio anônimo' : 'Submeter avaliação'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progresso — sticky */}
      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between text-sm text-gray-500">
          <span className="font-medium text-gray-700">Fator {factorIndex + 1} de {FACTORS.length}</span>
          <span>{totalAnswered} de {totalQuestions} questões respondidas</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${(totalAnswered / totalQuestions) * 100}%` }}
          />
        </div>
        {/* Factor dots */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {FACTORS.map((f, i) => {
            const done = f.questions.every(q => answers[q.id] !== undefined)
            const active = i === factorIndex
            return (
              <button
                key={f.id}
                onClick={() => setFactorIndex(i)}
                title={`${f.id} — ${f.name}`}
                className={`h-2.5 rounded-full transition-all ${
                  active
                    ? 'w-6 bg-blue-600'
                    : done
                    ? 'w-2.5 bg-blue-300 hover:bg-blue-400'
                    : 'w-2.5 bg-gray-200 hover:bg-gray-300'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Anonimidade reminder Modo B */}
      {showAnonymityReminder && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-800">
          Suas respostas são anônimas e não serão vinculadas a você.
        </div>
      )}

      {/* Fator atual */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-600">
          {currentFactor.dimension}
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{currentFactor.name}</h2>
        <p className="mt-1 text-xs text-gray-400">Consequência: {currentFactor.consequence}</p>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-400">
        Pressione <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">1</kbd>–<kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">5</kbd> para responder a questão destacada
      </p>

      {/* Questões */}
      {currentFactor.questions.map(q => {
        const scaleLabels = SCALE_LABELS[q.scale]
        const selected = answers[q.id]
        const isFocused = focusedQId === q.id

        return (
          <div
            key={q.id}
            ref={el => { answerRefs.current[q.id] = el }}
            onClick={() => setFocusedQId(q.id)}
            className={`rounded-xl border bg-white p-6 shadow-sm cursor-pointer transition-all ${
              isFocused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
            }`}
          >
            <p className="mb-4 text-sm font-medium text-gray-800">{q.text}</p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={e => { e.stopPropagation(); setFocusedQId(q.id); handleAnswer(q.id, v) }}
                  className={`rounded-lg border p-2 text-center transition-colors ${
                    selected === v
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="block text-base font-bold">{v}</span>
                  <span className="block text-[10px] leading-tight text-gray-500">{scaleLabels[v - 1]}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Nota clínica (admin, Modo A) */}
      {isAdmin && mode === 'A' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="mb-1 block text-sm font-medium text-amber-800">
            Observação clínica — {currentFactor.name} (opcional, visível apenas para você)
          </label>
          <textarea
            value={notes[currentFactor.id] ?? ''}
            onChange={e => setNotes(prev => ({ ...prev, [currentFactor.id]: e.target.value }))}
            rows={3}
            placeholder="Registre percepções técnicas sobre este fator…"
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Navegação */}
      <div className="flex gap-3">
        {factorIndex > 0 && (
          <button
            onClick={goToPrev}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </button>
        )}
        <button
          onClick={goToNext}
          disabled={isPending}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending
            ? 'Salvando…'
            : factorIndex < FACTORS.length - 1
            ? 'Próximo fator →'
            : 'Revisar respostas'}
        </button>
      </div>
    </div>
  )
}
