'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  createProgram,
  updateProgram,
  deleteProgram,
} from '@/app/actions/programs'
import type { ProgramFormState, ProgramRow } from '@/app/actions/programs'

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

// ─── Formulário de novo programa ──────────────────────────────────────────────

function NewProgramForm({ onCreated }: { onCreated: () => void }) {
  const [state, action] = useActionState<ProgramFormState, FormData>(createProgram, undefined)
  const formRef = useState<HTMLFormElement | null>(null)

  if (state?.success) {
    onCreated()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Novo Programa Padrão</h3>

      {state?.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nome do programa *</label>
          <input
            name="name"
            required
            placeholder="Ex: Programa de Bem-Estar Organizacional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          {state?.errors?.name && (
            <p className="mt-0.5 text-xs text-red-600">{state.errors.name[0]}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Descreva o objetivo do programa…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="flex justify-end">
          <SaveButton label="Criar programa" />
        </div>
      </form>
    </div>
  )
}

// ─── Linha editável ───────────────────────────────────────────────────────────

function ProgramRow({
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

  if (editState?.success && editing) {
    setEditing(false)
    router.refresh()
  }

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

  if (editing) {
    return (
      <li className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        {editState?.error && (
          <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{editState.error}</div>
        )}
        <form action={editAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
            <input
              name="name"
              defaultValue={program.name}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            {editState?.errors?.name && (
              <p className="mt-0.5 text-xs text-red-600">{editState.errors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Descrição</label>
            <textarea
              name="description"
              defaultValue={program.description ?? ''}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <SaveButton />
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{program.name}</p>
        {program.description && (
          <p className="mt-0.5 text-sm text-gray-500">{program.description}</p>
        )}
        {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
      </div>
      <div className="flex gap-2">
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

  function handleCreated() {
    setShowForm(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header da listagem */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {programs.length} programa(s) padrão cadastrado(s)
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? '✕ Cancelar' : '+ Novo Programa'}
        </button>
      </div>

      {/* Formulário de novo programa */}
      {showForm && <NewProgramForm onCreated={handleCreated} />}

      {/* Lista */}
      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum programa padrão cadastrado.</p>
          <p className="mt-1 text-xs text-gray-300">
            Programas padrão ficam disponíveis para todos os usuários ao criar planos de ação.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {programs.map(p => (
            <ProgramRow
              key={p.id}
              program={p}
              onDeleted={id => setPrograms(ps => ps.filter(x => x.id !== id))}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
