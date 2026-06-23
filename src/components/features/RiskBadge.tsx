import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const config: Record<RiskLevel, { label: string; dot: string; className: string }> = {
  baixo:    { label: 'Baixo',    dot: 'bg-emerald-500', className: 'bg-emerald-50  text-emerald-700 border-emerald-200' },
  moderado: { label: 'Moderado', dot: 'bg-amber-500',   className: 'bg-amber-50   text-amber-700   border-amber-200'   },
  alto:     { label: 'Alto',     dot: 'bg-orange-500',  className: 'bg-orange-50  text-orange-700  border-orange-200'  },
  critico:  { label: 'Crítico',  dot: 'bg-red-500',     className: 'bg-red-600    text-white        border-red-600'    },
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const { label, dot, className: colorClass } = config[level]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      colorClass,
      className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', level === 'critico' ? 'bg-red-200' : dot)} />
      {label}
    </span>
  )
}
