'use client'

import { useActionState, useState } from 'react'
import { RiskBadge } from '@/components/features/RiskBadge'
import { sendForApproval } from '@/app/actions/approvals'
import type { SendApprovalState, ApprovalRecord } from '@/app/actions/approvals'
import type { RiskLevel } from '@/types/database'
import { formatDate } from '@/lib/utils'

interface ScoreRow {
  factor_id: string
  factorName: string
  score: number
  level: string
}

interface Props {
  assessmentId: string
  planId: string
  planStatus: string
  companyId: string
  sectorId: string
  companyName: string
  sectorName: string
  assessmentMode: string
  assessmentCycle: number
  overallScore: number
  worstLevel: RiskLevel
  scores: ScoreRow[]
  approvals: ApprovalRecord[]
}

const APPROVAL_LABELS: Record<string, string> = {
  aprovado: 'Aprovado',
  com_ressalvas: 'Com Ressalvas',
  em_revisao: 'Em Revisão',
}

const APPROVAL_COLORS: Record<string, string> = {
  aprovado: 'bg-green-100 text-green-800 border-green-200',
  com_ressalvas: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  em_revisao: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function ApresentacaoClient({
  assessmentId,
  planId,
  companyId,
  sectorId,
  companyName,
  sectorName,
  assessmentMode,
  assessmentCycle,
  overallScore,
  worstLevel,
  scores,
  approvals,
}: Props) {
  const [showSendForm, setShowSendForm] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [sendState, sendAction, isSending] = useActionState<SendApprovalState, FormData>(
    sendForApproval,
    undefined,
  )

  const approvalUrl = sendState?.approvalUrl
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo da avaliação */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{companyName}</h2>
            <p className="text-sm text-gray-500">{sectorName} · Modo {assessmentMode} · Ciclo #{assessmentCycle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{overallScore}</p>
              <p className="text-xs text-gray-400">Score geral</p>
            </div>
            <RiskBadge level={worstLevel} />
          </div>
        </div>
      </div>

      {/* Download PPTX */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900">Apresentação para Gestores</h3>
            <p className="mt-1 text-sm text-blue-700">
              Deck PPTX com 4 slides: Capa · Resumo Executivo · Fatores de Risco · Plano de Ação
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/export/pptx?assessmentId=${assessmentId}`}
              download
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar PPTX
            </a>
            <a
              href={`/api/export/docx?assessmentId=${assessmentId}`}
              download
              className="flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar DOCX
            </a>
          </div>
        </div>
      </div>

      {/* Tabela de scores */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fatores de Risco — Resumo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Fator</th>
                <th className="px-4 py-2 font-medium text-right">Score</th>
                <th className="px-4 py-2 font-medium text-center">Nível</th>
              </tr>
            </thead>
            <tbody>
              {sortedScores.map(s => (
                <tr key={s.factor_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{s.factor_id}</td>
                  <td className="px-4 py-2 text-gray-800">{s.factorName}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-gray-700">
                    {s.score.toFixed(0)}/100
                  </td>
                  <td className="px-4 py-2 text-center">
                    <RiskBadge level={s.level as RiskLevel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de aprovação */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Encaminhar para Aprovação</h3>
        <p className="mb-4 text-sm text-gray-500">
          Gera um link seguro para o gestor revisar o diagnóstico e registrar a aprovação.
        </p>

        {/* Após envio bem-sucedido */}
        {sendState?.success && approvalUrl && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">Link de aprovação gerado!</p>
            <p className="mt-1 text-xs text-green-700">
              {process.env.NEXT_PUBLIC_APP_URL ? 'E-mail enviado (se configurado).' : ''}
              Compartilhe o link abaixo com o gestor responsável.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={approvalUrl}
                className="flex-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
              />
              <button
                onClick={() => handleCopyLink(approvalUrl)}
                className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                {copiedLink ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <a
              href={approvalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-green-700 underline hover:text-green-900"
            >
              Abrir página de aprovação →
            </a>
          </div>
        )}

        {sendState?.error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {sendState.error}
          </div>
        )}

        {!sendState?.success && (
          <>
            {!showSendForm ? (
              <button
                onClick={() => setShowSendForm(true)}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                Encaminhar para Aprovação →
              </button>
            ) : (
              <form action={sendAction} className="flex flex-col gap-3">
                <input type="hidden" name="plan_id" value={planId} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      E-mail do gestor *
                    </label>
                    <input
                      name="recipient_email"
                      type="email"
                      required
                      placeholder="gestor@empresa.com.br"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Nome do gestor *
                    </label>
                    <input
                      name="recipient_name"
                      type="text"
                      required
                      placeholder="Nome completo"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Um link de aprovação será gerado. O e-mail é enviado se o Resend estiver configurado.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSendForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isSending ? 'Enviando…' : 'Gerar link e enviar'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Histórico de aprovações */}
      {approvals.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Histórico de Aprovações</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {approvals.map(ap => (
              <div key={ap.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{ap.approved_by}</p>
                    <p className="text-xs text-gray-400">
                      {ap.approved_at
                        ? new Date(ap.approved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                        : formatDate(ap.created_at)}
                    </p>
                    {ap.notes && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {ap.notes}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${APPROVAL_COLORS[ap.status] ?? ''}`}>
                    {APPROVAL_LABELS[ap.status] ?? ap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <a
          href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/plano`}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Plano de Ação
        </a>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/aprovacao`}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Aprovações
          </a>
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/acompanhamento`}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Acompanhamento →
          </a>
        </div>
      </div>
    </div>
  )
}
