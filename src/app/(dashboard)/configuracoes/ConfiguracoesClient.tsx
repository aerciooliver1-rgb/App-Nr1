'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import {
  updateProfile,
  updatePassword,
  updateCompany,
  uploadCompanyLogo,
} from '@/app/actions/settings'
import type { SettingsFormState } from '@/app/actions/settings'
import {
  inviteUser,
  updateUserRole,
  revokeUser,
} from '@/app/actions/users'
import type { UserFormState, ManagedUser } from '@/app/actions/users'
import type { CompanyOption } from './page'
import type { UserRole } from '@/types/database'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Tab = 'perfil' | 'empresa' | 'usuarios'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  colaborador: 'Colaborador',
  visualizador: 'Visualizador',
}

function SaveButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? 'Salvando…' : label}
    </button>
  )
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
      {message}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  )
}

// ─── Aba Perfil ───────────────────────────────────────────────────────────────

function PerfilTab({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [profileState, profileAction] = useActionState<SettingsFormState, FormData>(updateProfile, undefined)
  const [passwordState, passwordAction] = useActionState<SettingsFormState, FormData>(updatePassword, undefined)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Dados do Perfil</h3>

        {profileState?.success && <SuccessBanner message="Nome atualizado com sucesso." />}
        {profileState?.error && <ErrorBanner message={profileState.error} />}

        <form action={profileAction} className="mt-3 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome de exibição</label>
            <input
              name="name"
              defaultValue={userName}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">E-mail</label>
            <input
              value={userEmail}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">O e-mail não pode ser alterado aqui.</p>
          </div>
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Alterar Senha</h3>

        {passwordState?.success && <SuccessBanner message="Senha alterada com sucesso." />}
        {passwordState?.error && <ErrorBanner message={passwordState.error} />}

        <form action={passwordAction} className="mt-3 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nova senha *</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            {passwordState?.errors?.password && (
              <p className="mt-0.5 text-xs text-red-600">{passwordState.errors.password[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Confirmar nova senha *</label>
            <input
              name="confirm"
              type="password"
              required
              placeholder="Repita a nova senha"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            {passwordState?.errors?.confirm && (
              <p className="mt-0.5 text-xs text-red-600">{passwordState.errors.confirm[0]}</p>
            )}
          </div>
          <div className="flex justify-end">
            <SaveButton label="Alterar senha" />
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Aba Empresa ──────────────────────────────────────────────────────────────

function EmpresaTab({ companies }: { companies: CompanyOption[] }) {
  const [selectedId, setSelectedId] = useState(companies[0]?.id ?? '')
  const selectedCompany = companies.find(c => c.id === selectedId)

  const [companyState, companyAction] = useActionState<SettingsFormState, FormData>(updateCompany, undefined)
  const [logoState, logoAction] = useActionState<SettingsFormState, FormData>(uploadCompanyLogo, undefined)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <p className="text-sm text-gray-400">Nenhuma empresa encontrada.</p>
        <a href="/empresas/nova" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
          Cadastrar empresa →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {companies.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-medium text-gray-700">Selecionar empresa</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Dados da Empresa</h3>

        {companyState?.success && <SuccessBanner message="Empresa atualizada." />}
        {companyState?.error && <ErrorBanner message={companyState.error} />}

        <form action={companyAction} className="mt-3 space-y-4">
          <input type="hidden" name="company_id" value={selectedId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome da empresa *</label>
            <input
              name="name"
              key={selectedId}
              defaultValue={selectedCompany?.name ?? ''}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-900">Logo da Empresa</h3>
        <p className="mb-4 text-xs text-gray-400">JPG, PNG ou SVG · máx. 2 MB</p>

        {(previewUrl ?? selectedCompany?.logo_url) && (
          <div className="mb-4">
            <p className="mb-1 text-xs text-gray-500">{previewUrl ? 'Pré-visualização' : 'Logo atual'}</p>
            <div className="relative h-20 w-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <Image
                src={previewUrl ?? selectedCompany!.logo_url!}
                alt="Logo"
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
          </div>
        )}

        {logoState?.success && <SuccessBanner message="Logo atualizado com sucesso." />}
        {logoState?.error && <ErrorBanner message={logoState.error} />}

        <form action={logoAction} className="mt-3 space-y-4">
          <input type="hidden" name="company_id" value={selectedId} />
          <input
            name="logo"
            type="file"
            accept="image/*"
            required
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) setPreviewUrl(URL.createObjectURL(file))
            }}
            className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <div className="flex justify-end">
            <SaveButton label="Fazer upload" />
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Aba Usuários ─────────────────────────────────────────────────────────────

function UsuariosTab({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const router = useRouter()
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [mutError, setMutError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [inviteState, inviteAction] = useActionState<UserFormState, FormData>(inviteUser, undefined)

  function handleRoleChange(userId: string, role: UserRole) {
    const prev = users.find(u => u.id === userId)?.role
    setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u))
    setMutError(null)
    startTransition(async () => {
      const result = await updateUserRole(userId, role)
      if (result.error) {
        setMutError(result.error)
        if (prev) setUsers(us => us.map(u => u.id === userId ? { ...u, role: prev } : u))
      } else {
        router.refresh()
      }
    })
  }

  function handleRevoke(userId: string, name: string) {
    if (!window.confirm(`Revogar acesso de "${name}"? Esta ação não pode ser desfeita.`)) return
    setMutError(null)
    startTransition(async () => {
      const result = await revokeUser(userId)
      if (result.error) {
        setMutError(result.error)
      } else {
        setUsers(us => us.filter(u => u.id !== userId))
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Convidar usuário */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-900">Convidar Usuário</h3>
        <p className="mb-4 text-xs text-gray-400">Um e-mail de convite será enviado com link de acesso.</p>

        {inviteState?.success && <SuccessBanner message="Convite enviado com sucesso." />}
        {inviteState?.error && <ErrorBanner message={inviteState.error} />}

        <form action={inviteAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo *</label>
              <input
                name="full_name"
                required
                placeholder="Ex: Maria Silva"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              {inviteState?.errors?.full_name && (
                <p className="mt-0.5 text-xs text-red-600">{inviteState.errors.full_name[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">E-mail *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@empresa.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              {inviteState?.errors?.email && (
                <p className="mt-0.5 text-xs text-red-600">{inviteState.errors.email[0]}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nível de acesso *</label>
            <select
              name="role"
              defaultValue="colaborador"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="colaborador">Colaborador — acesso padrão</option>
              <option value="visualizador">Visualizador — somente leitura</option>
              <option value="admin">Admin — acesso total</option>
            </select>
          </div>
          <div className="flex justify-end">
            <SaveButton label="Enviar convite" />
          </div>
        </form>
      </div>

      {/* Lista de usuários */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="font-semibold text-gray-900">Usuários Ativos</h3>
          <p className="text-xs text-gray-400">{users.length} usuário(s) cadastrado(s)</p>
        </div>

        {mutError && (
          <div className="mx-5 mt-3">
            <ErrorBanner message={mutError} />
          </div>
        )}

        {users.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Nenhum usuário encontrado.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {users.map(u => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-gray-900">{u.full_name}</span>
                  <span className="truncate text-xs text-gray-400">{u.email}</span>
                </div>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRevoke(u.id, u.full_name)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Revogar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Container principal ──────────────────────────────────────────────────────

export function ConfiguracoesClient({
  userName,
  userEmail,
  companies,
  isAdmin,
  initialUsers,
}: {
  userName: string
  userEmail: string
  companies: CompanyOption[]
  isAdmin: boolean
  initialUsers: ManagedUser[]
}) {
  const [tab, setTab] = useState<Tab>('perfil')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'empresa', label: 'Empresa' },
    ...(isAdmin ? [{ id: 'usuarios' as Tab, label: 'Usuários' }] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <PerfilTab userName={userName} userEmail={userEmail} />}
      {tab === 'empresa' && <EmpresaTab companies={companies} />}
      {tab === 'usuarios' && isAdmin && <UsuariosTab initialUsers={initialUsers} />}
    </div>
  )
}
