import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const config: Record<RiskLevel, { label: string; className: string }> = {
  baixo:    { label: 'Baixo',    className: 'bg-green-100 text-green-700 border-green-200' },
  moderado: { label: 'Moderado', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  alto:     { label: 'Alto',     className: 'bg-orange-100 text-orange-700 border-orange-200' },
  critico:  { label: 'Crítico',  className: 'bg-red-100 text-red-700 border-red-200' },
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const { label, className: colorClass } = config[level]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', colorClass, className)}>
      {label}
    </span>
  )
}
