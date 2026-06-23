import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getStats() {
  const supabase = await createClient()
  const [companies, assessments, actions] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('status', 'calculado'),
    supabase.from('actions').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
  ])
  const critical = await supabase
    .from('risk_scores')
    .select('id', { count: 'exact', head: true })
    .eq('level', 'critico')

  return {
    companies: companies.count ?? 0,
    assessments: assessments.count ?? 0,
    pendingActions: actions.count ?? 0,
    criticalRisks: critical.count ?? 0,
  }
}

interface StatCard {
  label: string
  sublabel: string
  value: number
  href: string
  borderColor: string
  valueColor: string
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards: StatCard[] = [
    {
      label: 'Empresas',
      sublabel: 'cadastradas',
      value: stats.companies,
      href: '/empresas',
      borderColor: 'border-t-blue-500',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Avaliações',
      sublabel: 'concluídas',
      value: stats.assessments,
      href: '/empresas',
      borderColor: 'border-t-emerald-500',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Ações',
      sublabel: 'pendentes',
      value: stats.pendingActions,
      href: '/empresas',
      borderColor: 'border-t-amber-500',
      valueColor: 'text-amber-600',
    },
    {
      label: 'Riscos',
      sublabel: 'críticos',
      value: stats.criticalRisks,
      href: '/empresas',
      borderColor: 'border-t-red-500',
      valueColor: stats.criticalRisks > 0 ? 'text-red-600' : 'text-gray-400',
    },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`group block rounded-xl border border-gray-200 border-t-4 bg-white px-6 py-5 shadow-sm transition-shadow hover:shadow-md ${card.borderColor}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {card.label}
              </p>
              <p className="text-xs text-gray-400">{card.sublabel}</p>
              <p className={`mt-3 text-4xl font-bold tabular-nums ${card.valueColor}`}>
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
