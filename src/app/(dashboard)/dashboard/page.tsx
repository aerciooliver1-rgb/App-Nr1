import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { RiskBadge } from '@/components/features/RiskBadge'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'
import { PLAN_RESPONSE_LIMITS, summarizeUsage, currentCycle } from '@/lib/billing'

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_LEVELS: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo']

const PLAN_LABEL: Record<string, string> = {
  trial: 'Trial',
  mensal: 'Start',
  semestral: 'Pro',
  anual: 'Enterprise',
}

const PLAN_COLOR: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-600',
  mensal: 'bg-blue-100 text-blue-700',
  semestral: 'bg-violet-100 text-violet-700',
  anual: 'bg-emerald-100 text-emerald-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function worstRisk(levels: string[]): RiskLevel | null {
  for (const l of RISK_LEVELS) {
    if (levels.includes(l)) return l
  }
  return null
}

function timeAgo(date: string | null | undefined): string {
  if (!date) return '—'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`
  return formatDate(date)
}

function usageBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-400'
  return 'bg-emerald-500'
}

function daysRemaining(periodEnd: string): number {
  return Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86_400_000))
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const in24h = new Date(now.getTime() + 86_400_000)

  const [
    companiesRes,
    overdueCountRes,
    overdueActionsRes,
    tokensRes,
    plansRes,
    pipelineRes,
    actionsStatusRes,
    recentRes,
    riskScoresRes,
    subscriptionRes,
    responsesThisMonthRes,
    calculatedNoPlanRes,
    planAssessmentIdsRes,
  ] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('actions').select('id', { count: 'exact', head: true })
      .neq('status', 'concluida')
      .lt('due_date', now.toISOString().split('T')[0]),

    supabase
      .from('actions')
      .select(`
        id, description, responsible, due_date, risk_level,
        action_plans(id, assessments(id, sectors(id, name, companies(id, name))))
      `)
      .neq('status', 'concluida')
      .lt('due_date', now.toISOString().split('T')[0])
      .order('due_date')
      .limit(5),

    supabase
      .from('assessment_tokens')
      .select(`id, expires_at, assessments(id, sectors(id, name, companies(id, name)))`)
      .eq('status', 'ativo')
      .gte('expires_at', now.toISOString())
      .lte('expires_at', in24h.toISOString())
      .limit(5),

    supabase
      .from('action_plans')
      .select(`id, assessments(id, cycle, sectors(id, name, companies(id, name))), approvals(id, status)`)
      .eq('status', 'finalizado')
      .limit(10),

    supabase.from('assessments').select('status'),
    supabase.from('actions').select('status'),

    supabase
      .from('assessments')
      .select(`id, cycle, updated_at, sectors(id, name, companies(id, name)), risk_scores(level)`)
      .eq('status', 'calculado')
      .order('updated_at', { ascending: false })
      .limit(8),

    supabase.from('risk_scores').select('level'),

    // Subscription data
    user
      ? supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),

    // Avaliações respondidas no mês (unidade de cobrança do plano)
    user
      ? supabase.rpc('count_monthly_responses', { p_user_id: user.id })
      : Promise.resolve({ data: 0 }),

    // Ciclos calculados — checados abaixo contra quais já têm plano de ação
    supabase
      .from('assessments')
      .select(`id, cycle, updated_at, sectors(id, name, companies(id, name)), risk_scores(level)`)
      .eq('status', 'calculado')
      .order('updated_at', { ascending: false }),
    supabase.from('action_plans').select('assessment_id'),
  ])

  const pipeline = { rascunho: 0, em_coleta: 0, concluido: 0, calculado: 0 }
  for (const a of pipelineRes.data ?? []) {
    const s = a.status as keyof typeof pipeline
    if (s in pipeline) pipeline[s]++
  }

  const actionsByStatus = { pendente: 0, em_andamento: 0, concluida: 0, atrasada: 0 }
  for (const a of actionsStatusRes.data ?? []) {
    const s = a.status as keyof typeof actionsByStatus
    if (s in actionsByStatus) actionsByStatus[s]++
  }

  const riskDist: Record<RiskLevel, number> = { critico: 0, alto: 0, moderado: 0, baixo: 0 }
  for (const r of riskScoresRes.data ?? []) {
    const l = r.level as RiskLevel
    if (l in riskDist) riskDist[l]++
  }

  const awaitingApproval = (plansRes.data ?? [])
    .filter(p => {
      const approvals = (p.approvals ?? []) as { status: string }[]
      if (approvals.length === 0) return true
      return approvals.at(-1)?.status === 'em_revisao'
    })
    .slice(0, 5)

  // Ciclos calculados com fator moderado+ que nunca passaram por
  // Intervenções/Plano — sem isso, "Acompanhamento" leva a um beco sem saída.
  const planAssessmentIds = new Set((planAssessmentIdsRes.data ?? []).map(p => p.assessment_id))
  // Sem limite de itens — diferente de ações atrasadas (podem ser dezenas),
  // esta categoria é uma falha de processo que deveria ser rara; escondê-la
  // atrás de um corte de "top 5" derrota o propósito do alerta.
  const pendingPlans = (calculatedNoPlanRes.data ?? [])
    .filter(a => !planAssessmentIds.has(a.id))
    .map(a => ({
      ...a,
      worst: worstRisk((a.risk_scores as { level: string }[]).map(r => r.level)),
    }))
    .filter((a): a is typeof a & { worst: RiskLevel } => !!a.worst && a.worst !== 'baixo')

  const totalCompanies = companiesRes.count ?? 0
  const responsesThisMonth = (responsesThisMonthRes.data as number | null) ?? 0

  return {
    kpis: {
      companies: totalCompanies,
      responsesThisMonth,
      activeCollections: pipeline.em_coleta,
      overdue: overdueCountRes.count ?? 0,
    },
    subscription: subscriptionRes.data ?? null,
    overdueActions: overdueActionsRes.data ?? [],
    expiringTokens: tokensRes.data ?? [],
    awaitingApproval,
    pendingPlans,
    pipeline,
    actionsByStatus,
    riskDist,
    recentAssessments: recentRes.data ?? [],
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, sublabel, value, display, href, topColor, valueColor, alert,
}: {
  label: string
  sublabel: string
  value: number
  display?: string
  href: string
  topColor: string
  valueColor: string
  alert?: boolean
}) {
  const className = `group relative block rounded-xl border border-gray-200 border-t-4 bg-white px-6 py-5 shadow-sm transition-shadow hover:shadow-md ${topColor}`
  const inner = (
    <>
      {alert && (
        <span className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
      <p className={`mt-3 text-4xl font-bold tabular-nums ${valueColor}`}>
        {display ?? value}
      </p>
    </>
  )
  // Âncora na própria página (ex.: #atencao-necessaria) usa <a> simples
  if (href.startsWith('#')) {
    return <a href={href} className={className}>{inner}</a>
  }
  return <Link href={href} className={className}>{inner}</Link>
}

function AlertIcon({ type, className }: { type: 'overdue' | 'token' | 'approval' | 'pending-plan'; className?: string }) {
  const base = {
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
  if (type === 'overdue') return (
    <svg {...base}>
      <path d="M10 2L2.5 17h15L10 2z" />
      <path d="M10 9v3.5" />
      <circle cx="10" cy="15" r=".5" fill="currentColor" />
    </svg>
  )
  if (type === 'token') return (
    <svg {...base}>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6.5v3.5l2.5 2.5" />
    </svg>
  )
  if (type === 'pending-plan') return (
    <svg {...base}>
      <path d="M10 3L2.5 15.5h15L10 3z" />
      <path d="M10 8.5v3M10 13.5h.01" />
    </svg>
  )
  return (
    <svg {...base}>
      <path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M7 8h6M7 11.5h3.5" />
    </svg>
  )
}

function AlertRow({
  type, title, meta, badge, tag, tagColor, href,
}: {
  type: 'overdue' | 'token' | 'approval' | 'pending-plan'
  title: string
  meta: string[]
  badge?: React.ReactNode
  tag: string
  tagColor: string
  href: string | null
}) {
  const iconBg = { overdue: 'bg-red-50', token: 'bg-amber-50', approval: 'bg-violet-50', 'pending-plan': 'bg-orange-50' }
  const iconColor = { overdue: 'text-red-500', token: 'text-amber-500', approval: 'text-violet-500', 'pending-plan': 'text-orange-500' }

  const inner = (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg[type]}`}>
        <AlertIcon type={type} className={`h-4 w-4 ${iconColor[type]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{meta.join(' · ')}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {badge}
        <span className={`text-[11px] font-medium ${tagColor}`}>{tag}</span>
      </div>
      {href && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-gray-300">
          <path d="M6 3l5 5-5 5" />
        </svg>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-gray-50">
        {inner}
      </Link>
    )
  }
  return <div>{inner}</div>
}

// ─── Plano & Uso Banner ───────────────────────────────────────────────────────

function PlanBanner({
  subscription,
  responsesThisMonth,
}: {
  subscription: {
    plan_type: string
    status: string
    responses_monthly_limit: number
    period_start: string
    period_end: string
  } | null
  responsesThisMonth: number
}) {
  const planType = subscription?.plan_type ?? 'trial'
  const limit = subscription?.responses_monthly_limit ?? PLAN_RESPONSE_LIMITS.trial
  const usage = summarizeUsage(responsesThisMonth, limit)
  const used = responsesThisMonth
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const barColor = usageBarColor(pct)
  const days = subscription ? daysRemaining(subscription.period_end) : 0
  const planLabel = PLAN_LABEL[planType] ?? planType
  const planChipColor = PLAN_COLOR[planType] ?? PLAN_COLOR.trial
  const isNearLimit = pct >= 80
  const isExpiringSoon = days <= 7

  return (
    <div className={`rounded-xl border bg-white px-6 py-4 shadow-sm ${
      isNearLimit || isExpiringSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">

        {/* Plano */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Plano atual</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${planChipColor}`}>
                {planLabel}
              </span>
              {subscription?.status === 'trial' && (
                <span className="text-xs text-gray-400">· modo demonstração</span>
              )}
            </div>
          </div>
        </div>

        {/* Uso de avaliações */}
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Avaliações respondidas este mês
            </p>
            <span className={`text-xs font-semibold tabular-nums ${isNearLimit ? 'text-amber-600' : 'text-gray-600'}`}>
              {used} / {limit.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {usage.blocked ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">
              Trava do ciclo atingida ({usage.monthlyCap.toLocaleString('pt-BR')}) — a contagem reinicia em {currentCycle(subscription?.period_start).nextReset.toLocaleDateString('pt-BR')}
            </p>
          ) : usage.excess > 0 ? (
            <p className="mt-1 text-[11px] text-amber-600">
              {usage.excess} extra{usage.excess !== 1 ? 's' : ''} este mês ({usage.overageBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) · até {usage.excessLimit} permitidos
            </p>
          ) : isNearLimit ? (
            <p className="mt-1 text-[11px] text-amber-600">{100 - pct}% restante da cota do ciclo</p>
          ) : null}
        </div>

        {/* Vigência */}
        {subscription && (
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Vigência</p>
            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${isExpiringSoon ? 'text-amber-600' : 'text-gray-700'}`}>
              {days === 0 ? 'Expira hoje' : `${days} dia${days !== 1 ? 's' : ''}`}
            </p>
            <p className="text-[11px] text-gray-400">
              até {new Date(subscription.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {/* CTA upgrade */}
        <Link
          href="/configuracoes?tab=plano"
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-600 sm:ml-2"
        >
          {subscription?.plan_type === 'trial' ? 'Ativar plano' : 'Gerenciar plano'}
        </Link>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const {
    kpis,
    subscription,
    overdueActions,
    expiringTokens,
    awaitingApproval,
    pendingPlans,
    recentAssessments,
  } = await getDashboardData()

  const totalAlerts = overdueActions.length + expiringTokens.length + awaitingApproval.length + pendingPlans.length

  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-5 p-6">

        {/* ── Plano & Uso ───────────────────────────────────────────────────── */}
        <PlanBanner
          subscription={subscription}
          responsesThisMonth={kpis.responsesThisMonth}
        />

        {/* ── Onboarding (sem empresas) ──────────────────────────────────────── */}
        {kpis.companies === 0 && (
          <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-8 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">Comece cadastrando sua primeira empresa</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cadastre uma empresa, crie setores e inicie o diagnóstico psicossocial NR-1.
            </p>
            <Link
              href="/empresas/nova"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Cadastrar primeira empresa
            </Link>
          </div>
        )}

        {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Empresas"
            sublabel="cadastradas"
            value={kpis.companies}
            href="/empresas"
            topColor="border-t-blue-500"
            valueColor="text-blue-600"
          />
          <KpiCard
            label="Avaliações"
            sublabel="respondidas este mês"
            value={kpis.responsesThisMonth}
            href="/configuracoes?tab=plano"
            topColor="border-t-violet-500"
            valueColor="text-violet-600"
          />
          <KpiCard
            label="Coletas"
            sublabel="ativas agora"
            value={kpis.activeCollections}
            href="/relatorios"
            topColor={kpis.activeCollections > 0 ? 'border-t-cyan-500' : 'border-t-gray-200'}
            valueColor={kpis.activeCollections > 0 ? 'text-cyan-600' : 'text-gray-300'}
          />
          <KpiCard
            label="Ações"
            sublabel="atrasadas"
            value={kpis.overdue}
            href="#atencao-necessaria"
            topColor={kpis.overdue > 0 ? 'border-t-red-500' : 'border-t-gray-200'}
            valueColor={kpis.overdue > 0 ? 'text-red-600' : 'text-gray-300'}
            alert={kpis.overdue > 0}
          />
        </div>

        {/* ── Coleta e pendências: Atenção Necessária × Avaliações Finalizadas ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* Atenção Necessária */}
          <div id="atencao-necessaria" className="overflow-hidden scroll-mt-6 rounded-xl border border-gray-200 border-t-4 border-t-red-500 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Atenção Necessária
              </h2>
              {totalAlerts > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-600">
                  {totalAlerts}
                </span>
              )}
            </div>

            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-500">
                    <path d="M4 10l5 5 7-7" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-600">Tudo em ordem</p>
                <p className="mt-0.5 text-xs text-gray-400">Nenhum item requer atenção imediata</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {overdueActions.map(action => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const plan = action.action_plans as any
                  const assessment = plan?.assessments
                  const sector = assessment?.sectors
                  const company = sector?.companies
                  const href = plan && assessment && sector && company
                    ? `/empresas/${company.id}/setores/${sector.id}/avaliacao/${assessment.id}/acompanhamento`
                    : null
                  return (
                    <AlertRow
                      key={action.id}
                      type="overdue"
                      title={action.description}
                      meta={[company?.name ?? '—', sector?.name ?? '—', `Resp: ${action.responsible || '—'}`]}
                      badge={action.risk_level
                        ? <RiskBadge level={action.risk_level as RiskLevel} />
                        : undefined}
                      tag={`Venceu ${formatDate(action.due_date)}`}
                      tagColor="text-red-600"
                      href={href}
                    />
                  )
                })}

                {expiringTokens.map(token => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const assessment = token.assessments as any
                  const sector = assessment?.sectors
                  const company = sector?.companies
                  const expiresIn = Math.max(0, Math.round(
                    (new Date(token.expires_at).getTime() - Date.now()) / 3_600_000
                  ))
                  return (
                    <AlertRow
                      key={token.id}
                      type="token"
                      title={`Token de coleta expirando — ${sector?.name ?? '—'}`}
                      meta={[company?.name ?? '—']}
                      tag={`Expira em ${expiresIn}h`}
                      tagColor="text-amber-600"
                      href={null}
                    />
                  )
                })}

                {awaitingApproval.map(plan => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const assessment = plan.assessments as any
                  const sector = assessment?.sectors
                  const company = sector?.companies
                  return (
                    <AlertRow
                      key={plan.id}
                      type="approval"
                      title="Plano de Ação aguardando aprovação"
                      meta={[company?.name ?? '—', sector?.name ?? '—', `Ciclo #${assessment?.cycle ?? '—'}`]}
                      tag="Aguardando"
                      tagColor="text-violet-600"
                      href={`/aprovacao/${plan.id}`}
                    />
                  )
                })}

                {pendingPlans.map(a => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sector = a.sectors as any
                  const company = sector?.companies
                  const href = company && sector
                    ? `/empresas/${company.id}/setores/${sector.id}/avaliacao/${a.id}/intervencoes`
                    : null
                  return (
                    <AlertRow
                      key={a.id}
                      type="pending-plan"
                      title="Ciclo com risco pendente, sem plano de ação"
                      meta={[company?.name ?? '—', sector?.name ?? '—', `Ciclo #${a.cycle}`]}
                      badge={<RiskBadge level={a.worst} />}
                      tag="Aplicar intervenção"
                      tagColor="text-orange-600"
                      href={href}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Avaliações Finalizadas */}
          <div className="overflow-hidden rounded-xl border border-gray-200 border-t-4 border-t-emerald-500 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Avaliações Finalizadas
              </h2>
              <Link href="/relatorios" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Ver todas →
              </Link>
            </div>
            {recentAssessments.length === 0 ? (
              <p className="py-10 text-center text-xs text-gray-400">
                Nenhuma avaliação calculada
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentAssessments.map(a => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sector = a.sectors as any
                  const company = sector?.companies
                  const risk = worstRisk(
                    (a.risk_scores as { level: string }[]).map(r => r.level)
                  )
                  const href = company && sector
                    ? `/empresas/${company.id}/setores/${sector.id}/avaliacao/${a.id}/resultado`
                    : null
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {company?.name ?? '—'}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {sector?.name ?? '—'} · Ciclo #{a.cycle}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {risk && <RiskBadge level={risk} />}
                        <span className="text-[11px] text-gray-400">{timeAgo(a.updated_at)}</span>
                      </div>
                      {href && (
                        <Link
                          href={href}
                          className="shrink-0 text-xs text-blue-500 transition-colors hover:text-blue-700"
                          aria-label="Ver resultado"
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M6 3l5 5-5 5" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </>
  )
}
