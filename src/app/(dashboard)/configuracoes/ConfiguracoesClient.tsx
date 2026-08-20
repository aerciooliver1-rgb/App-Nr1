'use client'

import { useActionState, useState, useTransition, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import {
  updateProfile,
  updatePassword,
  updateCompany,
  uploadCompanyLogo,
} from '@/app/actions/settings'
import type { SettingsFormState } from '@/app/actions/settings'
import {
  createTeamUser,
  updateUserRole,
  revokeUser,
} from '@/app/actions/users'
import type { UserFormState, ManagedUser } from '@/app/actions/users'
import type { CompanyOption, SubscriptionData } from './page'
import { PLAN_RESPONSE_LIMITS, summarizeUsage, currentCycle } from '@/lib/billing'
import type { UserRole } from '@/types/database'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Tab = 'perfil' | 'empresa' | 'usuarios' | 'plano'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  colaborador: 'Colaborador',
  visualizador: 'Visualizador',
  superadmin: 'Superadmin',
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

function PerfilTab({ userName, userEmail, userRegistry }: { userName: string; userEmail: string; userRegistry: string }) {
  const [profileState, profileAction] = useActionState<SettingsFormState, FormData>(updateProfile, undefined)
  const [passwordState, passwordAction] = useActionState<SettingsFormState, FormData>(updatePassword, undefined)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Dados do Perfil</h3>

        {profileState?.success && <SuccessBanner message="Perfil atualizado com sucesso." />}
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
            <label className="mb-1 block text-xs font-medium text-gray-700">Registro Profissional (CRP / CBO)</label>
            <input
              name="registro_profissional"
              defaultValue={userRegistry}
              placeholder="Ex: CRP 21/12345 ou CBO 2515-40"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Aparece nos relatórios PDF e PPTX gerados como responsável pela elaboração.
            </p>
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
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Alterar Senha</h3>

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
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Dados da Empresa</h3>

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
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Logo da Empresa</h3>
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

  const [inviteState, inviteAction] = useActionState<UserFormState, FormData>(createTeamUser, undefined)

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
      {/* Adicionar usuário */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Adicionar Usuário</h3>
        <p className="mb-4 text-xs text-gray-400">
          Defina a senha de acesso — a pessoa já poderá entrar com este e-mail e senha, sem precisar de convite por e-mail.
        </p>

        {inviteState?.success && <SuccessBanner message="Usuário criado com sucesso." />}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Senha de acesso *</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              {inviteState?.errors?.password && (
                <p className="mt-0.5 text-xs text-red-600">{inviteState.errors.password[0]}</p>
              )}
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
          </div>
          <div className="flex justify-end">
            <SaveButton label="Criar usuário" />
          </div>
        </form>
      </div>

      {/* Lista de usuários */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Usuários Ativos</h3>
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
                {u.role === 'superadmin' ? (
                  <span className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500">
                    {ROLE_LABELS.superadmin}
                  </span>
                ) : (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none"
                  >
                    {(['admin', 'colaborador', 'visualizador'] as const).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                )}
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

// ─── Aba Plano ───────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, {
  label: string
  color: string
  chip: string
}> = {
  trial:     { label: 'Trial',     color: 'border-t-gray-400',    chip: 'bg-gray-100 text-gray-700' },
  mensal:    { label: 'Start',      color: 'border-t-blue-500',    chip: 'bg-blue-100 text-blue-700' },
  semestral: { label: 'Pro',        color: 'border-t-violet-500',  chip: 'bg-violet-100 text-violet-700' },
  anual:     { label: 'Enterprise', color: 'border-t-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
}

function PlanoTab({
  subscription,
  responsesThisMonth,
}: {
  subscription: SubscriptionData | null
  responsesThisMonth: number
}) {
  const planType = subscription?.plan_type ?? 'trial'
  const limit = subscription?.responses_monthly_limit ?? PLAN_RESPONSE_LIMITS.trial
  const usage = summarizeUsage(responsesThisMonth, limit)
  const used = usage.used
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const cfg = PLAN_CONFIG[planType] ?? PLAN_CONFIG.trial
  const days = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.period_end).getTime() - Date.now()) / 86_400_000))
    : 0
  const isNearLimit = pct >= 80
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
  const capPct = Math.min(100, Math.round((used / usage.monthlyCap) * 100))

  return (
    <div className="space-y-6">
      {/* Resumo do plano atual */}
      <div className={`rounded-xl border border-t-4 border-gray-200 bg-white p-6 shadow-sm ${cfg.color}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Plano atual</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${cfg.chip}`}>
                {cfg.label}
              </span>
              {planType === 'trial' && (
                <span className="text-xs text-gray-400">modo demonstração</span>
              )}
            </div>
          </div>
          {subscription && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Vigência</p>
              <p className="text-sm font-semibold text-gray-700">
                {days === 0 ? 'Expira hoje' : `${days} dia${days !== 1 ? 's' : ''} restantes`}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(subscription.period_start + 'T00:00:00').toLocaleDateString('pt-BR')}
                {' até '}
                {new Date(subscription.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Avaliações este mês</p>
            <span className={`text-sm font-bold tabular-nums ${isNearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
              {used.toLocaleString('pt-BR')} / {limit.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            1 avaliação = 1 questionário completo respondido (gestor ou colaborador).
            O contador reinicia a cada 30 dias, contados da ativação do plano
            {subscription?.period_start && (
              <> — próximo reinício em <strong>{currentCycle(subscription.period_start).nextReset.toLocaleDateString('pt-BR')}</strong></>
            )}.
          </p>

          {usage.excess > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                Avaliações extras: {usage.excess.toLocaleString('pt-BR')} de {usage.excessLimit.toLocaleString('pt-BR')} permitidas no ciclo (20% da cota)
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Cobrança adicional estimada: <span className="font-bold">
                  {usage.overageBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span> (R$ 2,00 por avaliação extra, faturado no fechamento do ciclo)
              </p>
            </div>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] text-gray-400">
                Trava mensal do plano — cota + 20% de extras ({usage.monthlyCap.toLocaleString('pt-BR')} avaliações)
              </p>
              <span className="text-[11px] font-semibold tabular-nums text-gray-500">{capPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full ${usage.blocked ? 'bg-red-500' : capPct >= 80 ? 'bg-amber-400' : 'bg-gray-300'}`}
                style={{ width: `${capPct}%` }}
              />
            </div>
            {usage.blocked && (
              <p className="mt-1 text-xs text-red-600">
                Trava atingida — novas avaliações bloqueadas até o reinício do ciclo de 30 dias.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Container principal ──────────────────────────────────────────────────────

export function ConfiguracoesClient({
  userName,
  userEmail,
  userRegistry,
  companies,
  isAdmin,
  initialUsers,
  subscription,
  responsesThisMonth,
}: {
  userName: string
  userEmail: string
  userRegistry: string
  companies: CompanyOption[]
  isAdmin: boolean
  initialUsers: ManagedUser[]
  subscription: SubscriptionData | null
  responsesThisMonth: number
}) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return (t === 'plano' || t === 'empresa' || t === 'usuarios' || t === 'perfil') ? t : 'perfil'
  })

  const TABS: { id: Tab; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'empresa', label: 'Empresa' },
    ...(isAdmin ? [{ id: 'usuarios' as Tab, label: 'Usuários' }] : []),
    { id: 'plano', label: 'Plano' },
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
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <PerfilTab userName={userName} userEmail={userEmail} userRegistry={userRegistry} />}
      {tab === 'empresa' && <EmpresaTab companies={companies} />}
      {tab === 'usuarios' && isAdmin && <UsuariosTab initialUsers={initialUsers} />}
      {tab === 'plano' && (
        <PlanoTab subscription={subscription} responsesThisMonth={responsesThisMonth} />
      )}
    </div>
  )
}
