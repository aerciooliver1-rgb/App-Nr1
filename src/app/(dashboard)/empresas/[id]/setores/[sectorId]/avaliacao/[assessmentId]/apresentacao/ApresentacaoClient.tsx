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

// ── Constantes ────────────────────────────────────────────────────────────────

const APPROVAL_LABELS: Record<string, string> = {
  aprovado:      'Aprovado',
  com_ressalvas: 'Com Ressalvas',
  em_revisao:    'Em Revisão',
}

const APPROVAL_COLORS: Record<string, string> = {
  aprovado:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  com_ressalvas: 'bg-amber-50 text-amber-700 border-amber-200',
  em_revisao:    'bg-orange-50 text-orange-700 border-orange-200',
}

const RISK_BAR: Record<RiskLevel, string> = {
  baixo:    'bg-emerald-500',
  moderado: 'bg-amber-500',
  alto:     'bg-orange-500',
  critico:  'bg-red-600',
}

const RISK_BADGE_ID: Record<RiskLevel, string> = {
  baixo:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderado: 'bg-amber-50 text-amber-700 border-amber-200',
  alto:     'bg-orange-50 text-orange-700 border-orange-200',
  critico:  'bg-red-50 text-red-700 border-red-200',
}

const GAUGE_COLORS: Record<RiskLevel, string> = {
  baixo:    '#22c55e',
  moderado: '#eab308',
  alto:     '#f97316',
  critico:  '#ef4444',
}

// ── Gauge circular ────────────────────────────────────────────────────────────

function ScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const r = 56, cx = 72, cy = 72
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="144" height="144" viewBox="0 0 144 144">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={GAUGE_COLORS[level]} strokeWidth="12"
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">
        {score}
      </text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="11" fill="#94a3b8">
        de 100
      </text>
    </svg>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

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
  const [copiedLink, setCopiedLink]     = useState(false)

  const [sendState, sendAction, isSending] = useActionState<SendApprovalState, FormData>(
    sendForApproval,
    undefined,
  )

  const approvalUrl  = sendState?.approvalUrl
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  // Contagem por nível
  const countByLevel = scores.reduce<Record<string, number>>((acc, s) => {
    acc[s.level] = (acc[s.level] ?? 0) + 1
    return acc
  }, {})

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="flex flex-col">

      {/* ── Sub-header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-start gap-4">
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/plano`}
            className="mt-1 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Apresentação para Gestores</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {companyName} · {sectorName} · Modo {assessmentMode} · Ciclo #{assessmentCycle}
            </p>
          </div>
        </div>
        {/* Botões de exportação */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/pptx?assessmentId=${assessmentId}`}
            download
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M8 2v8M5 7l3 3 3-3M2 13v.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V13" />
            </svg>
            PPTX
          </a>
          <a
            href={`/api/export/pdf?assessmentId=${assessmentId}`}
            download
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" />
              <path d="M9 2v4h4M6 9h4M6 11h4" />
            </svg>
            PDF
          </a>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6">

        {/* ── Linha 1: gauge + resumo de níveis ───────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">

          {/* Score gauge */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-7 shadow-sm">
            <ScoreGauge score={overallScore} level={worstLevel} />
            <RiskBadge level={worstLevel} className="px-4 py-1.5 text-sm" />
          </div>

          {/* Distribuição por nível */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Distribuição dos Fatores
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { key: 'critico',  label: 'Crítico',  stripe: 'border-t-red-500',     num: 'text-red-700' },
                { key: 'alto',     label: 'Alto',     stripe: 'border-t-orange-500',  num: 'text-orange-700' },
                { key: 'moderado', label: 'Moderado', stripe: 'border-t-amber-500',   num: 'text-amber-700' },
                { key: 'baixo',    label: 'Baixo',    stripe: 'border-t-emerald-500', num: 'text-emerald-700' },
              ] as const).map(({ key, label, stripe, num }) => (
                <div key={key} className={`rounded-lg border border-gray-100 border-t-4 px-4 py-3 ${stripe}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className={`mt-1 text-3xl font-bold tabular-nums ${num}`}>
                    {countByLevel[key] ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-400">fator{(countByLevel[key] ?? 0) !== 1 ? 'es' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ranking de fatores ───────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
              <path d="M2 4h12M2 8h8M2 12h5" />
            </svg>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fatores de Risco — do mais crítico ao menos
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {sortedScores.map(s => (
              <div key={s.factor_id} className="flex items-center gap-4 px-6 py-3.5">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${RISK_BADGE_ID[s.level as RiskLevel]}`}>
                  {s.factor_id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{s.factorName}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1 rounded-full ${RISK_BAR[s.level as RiskLevel]}`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-gray-700">
                    {s.score.toFixed(0)}
                  </span>
                  <RiskBadge level={s.level as RiskLevel} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Encaminhar para Aprovação ────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500">
              <path d="M14 8l-6-6-6 6M8 2v9M4 14h8" />
            </svg>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Encaminhar para Aprovação
            </h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Gera um link seguro para o gestor revisar o diagnóstico e registrar a aprovação.
          </p>

          {/* Após envio bem-sucedido */}
          {sendState?.success && approvalUrl && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Link de aprovação gerado!</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Compartilhe o link abaixo com o gestor responsável.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={approvalUrl}
                  className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
                />
                <button
                  onClick={() => handleCopyLink(approvalUrl)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <a
                href={approvalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-emerald-700 underline hover:text-emerald-900"
              >
                Abrir página de aprovação →
              </a>
            </div>
          )}

          {sendState?.error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {sendState.error}
            </div>
          )}

          {!sendState?.success && (
            <>
              {!showSendForm ? (
                <button
                  onClick={() => setShowSendForm(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M14 8l-6-6-6 6M8 2v9M4 14h8" />
                  </svg>
                  Encaminhar para Aprovação
                </button>
              ) : (
                <form action={sendAction} className="flex flex-col gap-3">
                  <input type="hidden" name="plan_id" value={planId} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        E-mail do gestor *
                      </label>
                      <input
                        name="recipient_email"
                        type="email"
                        required
                        placeholder="gestor@empresa.com.br"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Nome do gestor *
                      </label>
                      <input
                        name="recipient_name"
                        type="text"
                        required
                        placeholder="Nome completo"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSending ? 'Enviando…' : 'Gerar link e enviar'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* ── Histórico de Aprovações ──────────────────────────────────── */}
        {approvals.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                <path d="M8 1.5l5 2v4c0 3-2.5 5.5-5 6.5C5.5 13 3 10.5 3 7.5v-4l5-2z" />
                <path d="M6 8l1.5 1.5L10 6" />
              </svg>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Histórico de Aprovações
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {approvals.map(ap => (
                <div key={ap.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{ap.approved_by}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {ap.approved_at
                        ? new Date(ap.approved_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })
                        : formatDate(ap.created_at)}
                    </p>
                    {ap.notes && (
                      <p className="mt-2 rounded-lg border-l-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {ap.notes}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${APPROVAL_COLORS[ap.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {APPROVAL_LABELS[ap.status] ?? ap.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navegação ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-between gap-3">
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/plano`}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Plano de Ação
          </a>
          <a
            href={`/empresas/${companyId}/setores/${sectorId}/avaliacao/${assessmentId}/acompanhamento`}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Acompanhamento →
          </a>
        </div>

      </div>
    </div>
  )
}
