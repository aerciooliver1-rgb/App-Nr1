'use client'

import { useEffect, useState, useTransition } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { closeCollection, extendDeadline } from '@/app/actions/assessments'
import { TOTAL_QUESTIONS } from '@/lib/data/questions'
import { formatDate } from '@/lib/utils'

const MIN_RESPONDENTS = 5

interface Props {
  assessmentId: string
  companyId: string
  sectorId: string
  surveyUrl: string
  tokenId: string
  tokenStatus: string
  expiresAt: string
  totalEmployees: number
  initialRespondents: number
  assessmentStatus: string
}

export function ColetaPanel({
  assessmentId,
  companyId,
  sectorId,
  surveyUrl,
  tokenId,
  tokenStatus,
  expiresAt,
  totalEmployees,
  initialRespondents,
  assessmentStatus,
}: Props) {
  const [respondents, setRespondents] = useState(initialRespondents)
  const [copied, setCopied] = useState(false)
  const [showExtend, setShowExtend] = useState(false)
  const [newExpiry, setNewExpiry] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isActive = tokenStatus === 'ativo' && new Date(expiresAt) > new Date()
  const canCalculate = respondents >= MIN_RESPONDENTS
  const progress = totalEmployees > 0 ? Math.min((respondents / totalEmployees) * 100, 100) : 0

  // Realtime: atualiza contagem quando novas respostas chegam
  useEffect(() => {
    if (!isActive) return
    const supabase = createClient()
    const channel = supabase
      .channel(`coleta-${assessmentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'assessment_answers', filter: `assessment_id=eq.${assessmentId}` },
        () => {
          setRespondents(prev => {
            // Incrementa a cada TOTAL_QUESTIONS novas respostas (= 1 respondente completo)
            return prev + Math.floor(1 / TOTAL_QUESTIONS)
          })
          // Re-fetch real count periodically instead of estimating
          supabase
            .from('assessment_answers')
            .select('*', { count: 'exact', head: true })
            .eq('assessment_id', assessmentId)
            .then(({ count }) => {
              if (count != null) setRespondents(Math.floor(count / TOTAL_QUESTIONS))
            })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [assessmentId, isActive])

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleExtend() {
    if (!newExpiry) return
    startTransition(async () => {
      const result = await extendDeadline(tokenId, assessmentId, newExpiry)
      if (result?.error) { setError(result.error); return }
      setShowExtend(false)
    })
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeCollection(assessmentId, companyId, sectorId)
      if (result?.error) setError(result.error)
    })
  }

  if (assessmentStatus === 'calculado') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">Coleta encerrada e resultado calculado.</p>
        <a
          href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/resultado`}
          className="mt-4 inline-block rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Ver resultado →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className={`rounded-xl border p-4 ${isActive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${isActive ? 'text-green-800' : 'text-red-800'}`}>
              {isActive ? 'Coleta ativa' : tokenStatus === 'encerrado' ? 'Coleta encerrada' : 'Link expirado'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Prazo: {formatDate(expiresAt)}</p>
          </div>
          {!isActive && tokenStatus !== 'encerrado' && (
            <button
              onClick={() => setShowExtend(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Progresso de respostas */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">{respondents}</p>
            <p className="text-sm text-gray-500">de {totalEmployees} funcionários responderam</p>
          </div>
          <span className="text-sm font-medium text-gray-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!canCalculate && respondents > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Mínimo de {MIN_RESPONDENTS} respondentes para garantir anonimato (ISO 45003:2021).
            Faltam {MIN_RESPONDENTS - respondents}.
          </p>
        )}
        {respondents === 0 && (
          <p className="mt-2 text-xs text-gray-400">Aguardando as primeiras respostas…</p>
        )}
      </div>

      {/* QR Code + Link */}
      {isActive && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Link de acesso para funcionários</h3>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="shrink-0 rounded-xl border border-gray-200 p-3">
              <QRCodeSVG value={surveyUrl} size={160} />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-xs text-gray-500">Compartilhe este link ou mostre o QR Code:</p>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-xs text-gray-700 font-mono">{surveyUrl}</span>
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded-md bg-white border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-green-700">
                O link não exige login. Nenhum dado pessoal é coletado.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Ações */}
      {isActive && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowExtend(true)}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Estender prazo
          </button>
          <button
            onClick={() => setShowCloseConfirm(true)}
            disabled={!canCalculate}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            title={!canCalculate ? `Aguarde ao menos ${MIN_RESPONDENTS} respondentes` : ''}
          >
            Encerrar e calcular
          </button>
        </div>
      )}

      {/* Modal: Estender prazo */}
      {showExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-semibold text-gray-900">Estender prazo de coleta</h3>
            <input
              type="datetime-local"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtend(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtend}
                disabled={isPending || !newExpiry}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar encerramento */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-gray-900">Encerrar coleta?</h3>
            <p className="mb-4 text-sm text-gray-600">
              <strong>{respondents}</strong> de <strong>{totalEmployees}</strong> funcionários responderam.
              Deseja encerrar a coleta e iniciar o cálculo de riscos agora?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Calculando…' : 'Sim, encerrar e calcular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
