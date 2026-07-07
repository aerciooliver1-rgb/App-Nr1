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
  headerClass: string
  badgeClass: string
  cardBorder: string
}> = {
  critico: {
    label: 'Crítico',
    deadline: 'início em até 30 dias',
    headerClass: 'text-red-700',
    badgeClass: 'bg-red-100 text-red-700',
    cardBorder: 'border-l-red-500',
  },
  alto: {
    label: 'Alto',
    deadline: 'início em até 90 dias',
    headerClass: 'text-orange-700',
    badgeClass: 'bg-orange-100 text-orange-700',
    cardBorder: 'border-l-orange-400',
  },
  moderado: {
    label: 'Moderado',
    deadline: 'início em até 6 meses',
    headerClass: 'text-amber-700',
    badgeClass: 'bg-amber-100 text-amber-800',
    cardBorder: 'border-l-amber-400',
  },
}

const LEVEL_ORDER = ['moderado', 'alto', 'critico', 'outros']

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
}: {
  program: ProgramRow
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  if (editing) {
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
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
        <InfoItem label="Carga Horária" value={program.workload} />
        <InfoItem label="Prazo de Início" value={program.start_deadline} />
        <InfoItem label="Público-alvo" value={program.target_audience} />
        <InfoItem label="Modalidade" value={program.modality} />
        <InfoItem label="Encontros" value={program.sessions} />
      </div>

      {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}

      {/* Ações */}
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
    </li>
  )
}

// ─── Container principal ──────────────────────────────────────────────────────

export function CatalogoClient({ initialPrograms }: { initialPrograms: ProgramRow[] }) {
  const [programs, setPrograms] = useState<ProgramRow[]>(initialPrograms)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  useEffect(() => setPrograms(initialPrograms), [initialPrograms])

  function handleCreated() {
    setShowForm(false)
    router.refresh()
  }

  const grouped = LEVEL_ORDER.map(level => ({
    level,
    items: programs.filter(p =>
      level === 'outros' ? !LEVEL_CONFIG[p.level ?? ''] : p.level === level,
    ),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-8">
      {/* Header da listagem */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {programs.length} programa(s) no catálogo — cobrindo os 13 fatores de risco NR-1
        </p>
        <button
          onClick={() => setShowForm(s => !s)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Novo Programa'}
        </button>
      </div>

      {/* Formulário de novo programa */}
      {showForm && <NewProgramForm onCreated={handleCreated} />}

      {/* Grupos por nível */}
      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum programa cadastrado.</p>
        </div>
      ) : (
        grouped.map(group => {
          const cfg = LEVEL_CONFIG[group.level]
          return (
            <section key={group.level}>
              <h2 className={`mb-3 text-sm font-bold uppercase tracking-wide ${cfg?.headerClass ?? 'text-gray-500'}`}>
                {cfg ? `${cfg.label} — ${cfg.deadline}` : 'Outros programas'}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                  {group.items.length}
                </span>
              </h2>
              <ul className="space-y-3">
                {group.items.map(p => (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    onDeleted={id => setPrograms(ps => ps.filter(x => x.id !== id))}
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
