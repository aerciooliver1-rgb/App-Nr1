import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'

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

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Empresas cadastradas', value: stats.companies, color: 'bg-blue-50 text-blue-700' },
    { label: 'Avaliações concluídas', value: stats.assessments, color: 'bg-green-50 text-green-700' },
    { label: 'Ações pendentes', value: stats.pendingActions, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Riscos críticos', value: stats.criticalRisks, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.color} rounded-lg px-3 py-1 inline-block`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
