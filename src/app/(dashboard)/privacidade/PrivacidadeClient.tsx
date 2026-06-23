'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { exportUserData, permanentDeleteUser } from '@/app/actions/lgpd'
import type { ManagedUser } from '@/app/actions/users'

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Painel de exclusão ───────────────────────────────────────────────────────

function DeletePanel({
  user,
  onCancel,
  onDeleted,
}: {
  user: ManagedUser
  onCancel: () => void
  onDeleted: () => void
}) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm(
      `ATENÇÃO: Esta ação é irreversível.\n\nExcluir permanentemente "${user.full_name}" (${user.email}) e todos os seus dados pessoais?`,
    )) return

    setError(null)
    startTransition(async () => {
      const result = await permanentDeleteUser(user.id, confirmation)
      if (result.error) {
        setError(result.error)
      } else {
        onDeleted()
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        Exclusão permanente — LGPD Art. 18, VI
      </p>
      <p className="text-xs text-red-600">
        Esta ação excluirá a conta, perfil e logs de auditoria de <strong>{user.full_name}</strong>.
        Dados de avaliações e planos de ação vinculados ao usuário serão desvinculados (não excluídos).
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-red-700">
          Digite <strong>EXCLUIR</strong> para confirmar:
        </label>
        <input
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
          placeholder="EXCLUIR"
          className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleDelete}
          disabled={confirmation !== 'EXCLUIR'}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Excluir permanentemente
        </button>
      </div>
    </div>
  )
}

// ─── Linha de usuário ─────────────────────────────────────────────────────────

function UserCard({
  user,
  onDeleted,
}: {
  user: ManagedUser
  onDeleted: (id: string) => void
}) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    const result = await exportUserData(user.id)
    setExporting(false)
    if (result.error) {
      setExportError(result.error)
    } else if (result.data) {
      const slug = user.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      downloadJson(result.data, `lgpd_export_${slug}.json`)
    }
  }

  return (
    <li className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{user.full_name}</p>
          <p className="text-xs text-gray-400">{user.email} · {user.role}</p>
          {exportError && <p className="mt-1 text-xs text-red-600">{exportError}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? 'Exportando…' : 'Exportar JSON'}
          </button>
          <button
            onClick={() => setShowDelete(s => !s)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            {showDelete ? 'Cancelar' : 'Excluir'}
          </button>
        </div>
      </div>

      {showDelete && (
        <DeletePanel
          user={user}
          onCancel={() => setShowDelete(false)}
          onDeleted={() => onDeleted(user.id)}
        />
      )}
    </li>
  )
}

// ─── Container principal ──────────────────────────────────────────────────────

export function PrivacidadeClient({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? users.filter(u =>
        u.full_name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()),
      )
    : users

  return (
    <div className="space-y-5">
      {/* Busca */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Buscar colaborador</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nome ou e-mail…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
          <p className="text-sm text-gray-400">
            {query ? 'Nenhum usuário encontrado para essa busca.' : 'Nenhum usuário cadastrado.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              onDeleted={id => setUsers(us => us.filter(x => x.id !== id))}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
