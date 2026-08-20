'use client'

import { useEffect, useState, useTransition } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  createProgram,
  updateProgram,
  deleteProgram,
} from '@/app/actions/programs'
import type { ProgramFormState, ProgramRow } from '@/app/actions/programs'
import { FACTORS } from '@/lib/data/questions'

// ─── Configuração visual por nível ────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, {
  label: string
  deadline: string
  summary: string
  headerClass: string
  badgeClass: string
  cardBorder: string
  dotClass: string
}> = {
  critico: {
    label: 'Crítico',
    deadline: 'início em até 30 dias',
    summary: 'Resposta intensiva e urgente',
    headerClass: 'text-red-700',
    badgeClass: 'bg-red-100 text-red-700',
    cardBorder: 'border-l-red-500',
    dotClass: 'bg-red-500',
  },
  alto: {
    label: 'Alto',
    deadline: 'início em até 90 dias',
    summary: 'Intervenção estruturada',
    headerClass: 'text-orange-700',
    badgeClass: 'bg-orange-100 text-orange-700',
    cardBorder: 'border-l-orange-400',
    dotClass: 'bg-orange-400',
  },
  moderado: {
    label: 'Moderado',
    deadline: 'início em até 6 meses',
    summary: 'Prevenção',
    headerClass: 'text-amber-700',
    badgeClass: 'bg-amber-100 text-amber-800',
    cardBorder: 'border-l-amber-400',
    dotClass: 'bg-amber-400',
  },
}

const LEVEL_ORDER = ['moderado', 'alto', 'critico', 'outros']
const LEVEL_CARD_ORDER = ['moderado', 'alto', 'critico'] as const

// ─── Etapas da intervenção — popup explicativo por programa ──────────────────

type DetailKey = 'objectives' | 'structure' | 'methodology' | 'materials' | 'indicators'

const DETAIL_STEPS: { key: DetailKey; label: string; icon: string }[] = [
  { key: 'objectives', label: 'Objetivos', icon: 'M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' },
  { key: 'structure', label: 'Estrutura e encontros', icon: 'M8 2v3M16 2v3M3.5 9h17M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  { key: 'methodology', label: 'Metodologia e abordagem', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
  { key: 'materials', label: 'Entregáveis', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { key: 'indicators', label: 'Indicadores', icon: 'M3 3v18h18M7 16l4-6 3 3 5-7' },
]

function DetailIcon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  )
}

/** Lista de bullets — cada linha do campo (separado por \n) vira um item. */
function BulletList({ text }: { text: string }) {
  const items = text.split('\n').map(l => l.trim()).filter(Boolean)
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Indicadores — cada linha é "Indicador | Como medir | Quando verificar". */
function IndicatorsTable({ text }: { text: string }) {
  const rows = text.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(c => c.trim()))
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2">Indicador</th>
            <th className="px-3 py-2">Como medir</th>
            <th className="px-3 py-2">Quando verificar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((cols, i) => (
            <tr key={i}>
              {cols.map((c, j) => (
                <td key={j} className={`px-3 py-2.5 align-top ${j === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProgramDetailModal({
  program,
  detailKey,
  onClose,
}: {
  program: ProgramRow
  detailKey: DetailKey
  onClose: () => void
}) {
  const content = program[detailKey]
  const step = DETAIL_STEPS.find(s => s.key === detailKey)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {program.code && (
                <span className="rounded-md bg-gray-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {program.code}
                </span>
              )}
              <p className="text-sm font-semibold text-gray-900">{program.name}</p>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-blue-700">
              <DetailIcon d={step.icon} className="h-5 w-5" />
              <h3 className="text-lg font-bold">{step.label}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
              <path d="M15 5 5 15M5 5l10 10" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          {!content ? (
            <p className="text-sm text-gray-400">Conteúdo não cadastrado para este programa.</p>
          ) : detailKey === 'indicators' ? (
            <IndicatorsTable text={content} />
          ) : (
            <BulletList text={content} />
          )}
        </div>

        {detailKey === 'materials' && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-blue-50 px-3.5 py-3 text-xs leading-relaxed text-blue-700">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-4 w-4 shrink-0">
              <path d="M10 13.5v-3M10 6.75h.01M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              O modelo de entregável pronto para preencher fica disponível na página de{' '}
              <strong className="font-semibold">Plano de Ação</strong>, no botão &ldquo;Documentação&rdquo; de cada ação.
            </span>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

function SaveButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? 'Salvando…' : label}
    </button>
  )
}

// ─── Formulário completo (criação e edição) ───────────────────────────────────

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  error,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {label}{required ? ' *' : ''}
      </label>
      <input
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
      />
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function TextareaField({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
  rows = 4,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  hint?: string
  rows?: number
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function ProgramForm({
  program,
  action,
  state,
  onCancel,
  submitLabel,
}: {
  program?: ProgramRow
  action: (formData: FormData) => void
  state: ProgramFormState
  onCancel?: () => void
  submitLabel: string
}) {
  const selectedFactors = new Set(
    (program?.factor_ids ?? '')
      .split('·')
      .map(f => f.trim())
      .filter(f => /^F\d{2}$/.test(f)),
  )
  const isTodos = (program?.factor_ids ?? '').toLowerCase().includes('todos')

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[110px_1fr_170px]">
        <Field label="Código" name="code" defaultValue={program?.code} placeholder="Ex: P-C1" />
        <Field
          label="Nome do programa"
          name="name"
          defaultValue={program?.name}
          placeholder="Ex: Programa de Bem-Estar Organizacional"
          required
          error={state?.errors?.name?.[0]}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nível de risco</label>
          <select
            name="level"
            defaultValue={program?.level ?? 'moderado'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="critico">Crítico — até 30 dias</option>
            <option value="alto">Alto — até 90 dias</option>
            <option value="moderado">Moderado — até 6 meses</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Descrição</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={program?.description ?? ''}
          placeholder="Descreva o objetivo do programa…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Fatores NR-1 abordados */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700">Fator(es) NR-1 abordado(s)</label>
        <div className="flex flex-wrap gap-1.5">
          {FACTORS.map(f => (
            <label
              key={f.id}
              title={f.name}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
            >
              <input
                type="checkbox"
                name="factors"
                value={f.id}
                defaultChecked={selectedFactors.has(f.id)}
                className="h-3 w-3 accent-blue-600"
              />
              {f.id}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700">
            <input
              type="checkbox"
              name="factors"
              value="todos"
              defaultChecked={isTodos}
              className="h-3 w-3 accent-emerald-600"
            />
            Todos (prevenção)
          </label>
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          Passe o mouse sobre um código para ver o nome do fator. &ldquo;Todos&rdquo; marca programas de prevenção geral.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Carga horária" name="workload" defaultValue={program?.workload} placeholder="Ex: 8 horas" />
        <Field label="Prazo de início" name="start_deadline" defaultValue={program?.start_deadline} placeholder="Ex: Até 30 dias" />
        <Field label="Público-alvo" name="target_audience" defaultValue={program?.target_audience} placeholder="Ex: Gestores + equipe toda" />
        <Field label="Modalidade" name="modality" defaultValue={program?.modality} placeholder="Ex: Presencial, Online ou Híbrido" />
        <Field label="Nº de encontros" name="sessions" defaultValue={program?.sessions} placeholder="Ex: 2 encontros de 4h" />
      </div>

      {/* Etapas da intervenção — conteúdo exibido nos popups do card */}
      <div className="space-y-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Etapas da intervenção — exibidas nos botões do card
        </p>
        <TextareaField
          label="Objetivos do programa"
          name="objectives"
          defaultValue={program?.objectives}
          placeholder={'Identificar e nomear o comportamento de risco\nCapacitar gestores para prevenir e responder\nGarantir conformidade com a NR-1'}
          hint="Um objetivo por linha."
        />
        <TextareaField
          label="Estrutura e encontros"
          name="structure"
          defaultValue={program?.structure}
          placeholder={'Encontro 1 — 4h (equipe toda): conceitos e casos situacionais\nEncontro 2 — 4h (gestores): protocolo e acolhimento\nEntregável: Política formalizada e assinada'}
          hint="Uma etapa/entregável por linha."
        />
        <TextareaField
          label="Metodologia e abordagem"
          name="methodology"
          defaultValue={program?.methodology}
          placeholder={'Psicoeducação com casos situacionais\nRole play de situações práticas\nConstrução coletiva do protocolo'}
          hint="Uma técnica/abordagem por linha."
        />
        <TextareaField
          label="Entregáveis"
          name="materials"
          defaultValue={program?.materials}
          placeholder={'Cartaz "O que não toleramos aqui" para afixar\nRegistro de presença para o PGR'}
          hint="Um entregável por linha — o que a intervenção produz de concreto."
        />
        <TextareaField
          label="Indicadores de eficácia"
          name="indicators"
          defaultValue={program?.indicators}
          placeholder={'Redução do score do fator | Comparação na reavaliação | 6 meses após o programa\nPolítica formalizada | Verificação documental | Ao final do programa'}
          hint={'Um indicador por linha, separando as 3 colunas com " | ": Indicador | Como medir | Quando verificar'}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <SaveButton label={submitLabel} />
      </div>
    </form>
  )
}

function NewProgramForm({ onCreated }: { onCreated: () => void }) {
  const [state, action] = useActionState<ProgramFormState, FormData>(createProgram, undefined)

  useEffect(() => {
    if (state?.success) onCreated()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success])

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Novo Programa</h3>
      <ProgramForm action={action} state={state} submitLabel="Criar programa" />
    </div>
  )
}

// ─── Card do programa ─────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-700">{value ?? '—'}</p>
    </div>
  )
}

function ProgramCard({
  program,
  onDeleted,
  role,
}: {
  program: ProgramRow
  onDeleted: (id: string) => void
  role: string | null
}) {
  // Superadmin gerencia todo o catálogo; admin de conta só gerencia os
  // programas personalizados que criou (o padrão é somente leitura para ele).
  const canManage = role === 'superadmin' || (role === 'admin' && program.type === 'personalizado')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [openDetail, setOpenDetail] = useState<DetailKey | null>(null)

  const boundUpdate = updateProgram.bind(null, program.id)
  const [editState, editAction] = useActionState<ProgramFormState, FormData>(boundUpdate, undefined)

  useEffect(() => {
    if (editState?.success) {
      setEditing(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editState?.success])

  function handleDelete() {
    if (!window.confirm(`Excluir "${program.name}"? Esta ação não pode ser desfeita.`)) return
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteProgram(program.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        onDeleted(program.id)
        router.refresh()
      }
    })
  }

  const cfg = LEVEL_CONFIG[program.level ?? ''] ?? null

  if (editing && canManage) {
    return (
      <li className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <ProgramForm
          program={program}
          action={editAction}
          state={editState}
          onCancel={() => setEditing(false)}
          submitLabel="Salvar alterações"
        />
      </li>
    )
  }

  return (
    <li className={`rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm ${cfg?.cardBorder ?? 'border-l-gray-200'}`}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {program.code && (
            <span className="rounded-md bg-gray-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
              {program.code}
            </span>
          )}
          <p className="font-semibold text-gray-900">{program.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {program.factor_ids && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {program.factor_ids}
            </span>
          )}
          {cfg && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Descrição */}
      {program.description && (
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{program.description}</p>
      )}

      {/* Ficha técnica */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <InfoItem label="Carga Horária" value={program.workload} />
        <InfoItem label="Prazo de Início" value={program.start_deadline} />
        <InfoItem label="Público-alvo" value={program.target_audience} />
        <InfoItem label="Modalidade" value={program.modality} />
        <InfoItem label="Formato" value={program.sessions} />
        <InfoItem label="Faixa de Score" value={program.score_range} />
      </div>

      {/* Etapas da intervenção — abrem popup explicativo (uma única linha, com scroll horizontal se faltar espaço) */}
      <div className="mt-4 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto border-t border-gray-100 px-1 pt-3.5 pb-0.5">
        {DETAIL_STEPS.map(step => (
          <button
            key={step.key}
            onClick={() => setOpenDetail(step.key)}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
          >
            <DetailIcon d={step.icon} />
            {step.label}
          </button>
        ))}
      </div>

      {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}

      {/* Ações — apenas superadmin gerencia; demais níveis têm acesso somente leitura */}
      {canManage && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      )}

      {openDetail && (
        <ProgramDetailModal
          program={program}
          detailKey={openDetail}
          onClose={() => setOpenDetail(null)}
        />
      )}
    </li>
  )
}

// ─── Container principal ──────────────────────────────────────────────────────

export function CatalogoClient({
  initialPrograms,
  role,
}: {
  initialPrograms: ProgramRow[]
  role: string | null
}) {
  const canCreate = role === 'superadmin' || role === 'admin'
  const [programs, setPrograms] = useState<ProgramRow[]>(initialPrograms)
  const [showForm, setShowForm] = useState(false)
  const [openLevel, setOpenLevel] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => setPrograms(initialPrograms), [initialPrograms])

  function handleCreated() {
    setShowForm(false)
    router.refresh()
  }

  const outros = programs.filter(p => !LEVEL_CONFIG[p.level ?? ''])
  const openGroup = openLevel === 'outros'
    ? { level: 'outros', items: outros }
    : openLevel
      ? { level: openLevel, items: programs.filter(p => p.level === openLevel) }
      : null

  return (
    <div className="space-y-8">
      {/* Header da listagem */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {programs.length} programa(s) no catálogo — cobrindo os 13 fatores de risco NR-1
        </p>
        {canCreate && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {showForm ? 'Cancelar' : '+ Novo Programa'}
          </button>
        )}
      </div>

      {/* Formulário de novo programa */}
      {canCreate && showForm && <NewProgramForm onCreated={handleCreated} />}

      {/* Cards de nível — estilo cards da página Empresas */}
      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum programa cadastrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {LEVEL_CARD_ORDER.map(level => {
            const cfg = LEVEL_CONFIG[level]
            const count = programs.filter(p => p.level === level).length
            return (
              <button
                key={level}
                onClick={() => setOpenLevel(level)}
                className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-l-4 bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md ${cfg.cardBorder} border-gray-200`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dotClass}`} />
                  <div>
                    <p className={`font-semibold ${cfg.headerClass}`}>{cfg.label}</p>
                    <p className="text-sm text-gray-500">{cfg.summary} — {cfg.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}>
                    {count} programa{count !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                    Ver programas
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </span>
                </div>
              </button>
            )
          })}

          {outros.length > 0 && (
            <button
              onClick={() => setOpenLevel('outros')}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-l-4 border-l-gray-300 border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
                <div>
                  <p className="font-semibold text-gray-700">Outros programas</p>
                  <p className="text-sm text-gray-500">Sem nível de risco definido</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                  {outros.length} programa{outros.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                  Ver programas
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {openGroup && (
        <LevelProgramsModal
          level={openGroup.level}
          programs={openGroup.items}
          onClose={() => setOpenLevel(null)}
          onDeleted={id => setPrograms(ps => ps.filter(x => x.id !== id))}
          role={role}
        />
      )}
    </div>
  )
}

// ─── Popup por nível — lista os programas daquela criticidade ────────────────

function LevelProgramsModal({
  level,
  programs,
  onClose,
  onDeleted,
  role,
}: {
  level: string
  programs: ProgramRow[]
  onClose: () => void
  onDeleted: (id: string) => void
  role: string | null
}) {
  const cfg = LEVEL_CONFIG[level]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${cfg?.headerClass ?? 'text-gray-500'}`}>
              {cfg ? `${cfg.label} — ${cfg.summary}` : 'Outros programas'}
            </p>
            <h3 className="mt-0.5 font-semibold text-gray-900">
              {programs.length} programa{programs.length !== 1 ? 's' : ''}
              {cfg ? ` · ${cfg.deadline}` : ''}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
              <path d="M15 5 5 15M5 5l10 10" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {programs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nenhum programa neste nível.</p>
          ) : (
            <ul className="space-y-3">
              {programs.map(p => (
                <ProgramCard key={p.id} program={p} onDeleted={onDeleted} role={role} />
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
