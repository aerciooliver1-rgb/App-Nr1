'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RiskBadge } from '@/components/features/RiskBadge'
import { formatDate } from '@/lib/utils'
import type { RiskLevel } from '@/types'

interface Company {
  id: string
  name: string
  cnpj: string | null
  created_at: string
  sectorCount: number
  risk: RiskLevel | null
}

const RISK_STRIPE: Record<RiskLevel, string> = {
  critico:  'border-l-red-500',
  alto:     'border-l-orange-400',
  moderado: 'border-l-amber-400',
  baixo:    'border-l-emerald-400',
}

function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function EmpresasSearch({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? companies.filter(
        c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.cnpj ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, ''))
      )
    : companies

  return (
    <>
      {companies.length > 3 && (
        <div className="relative mb-5 max-w-sm">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <IconSearch />
          </span>
          <input
            type="search"
            placeholder="Buscar empresa ou CNPJ…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
          Nenhuma empresa encontrada para &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(company => (
            <Link
              key={company.id}
              href={`/empresas/${company.id}`}
              className={`group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-gray-200 border-l-4 bg-white px-5 py-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                company.risk ? RISK_STRIPE[company.risk] : 'border-l-gray-200'
              }`}
            >
              {/* Identificação */}
              <div className="min-w-[220px]">
                <p className="font-semibold text-gray-900 transition-colors group-hover:text-blue-700">
                  {company.name}
                </p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">
                  {company.cnpj ?? 'CNPJ não informado'}
                </p>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Setores
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-gray-800">
                    {company.sectorCount}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Risco
                  </p>
                  <div className="mt-1">
                    {company.risk
                      ? <RiskBadge level={company.risk} />
                      : <span className="text-xs text-gray-300">Sem avaliação</span>}
                  </div>
                </div>

                <div className="hidden text-center sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Cadastro
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-gray-500">
                    {formatDate(company.created_at)}
                  </p>
                </div>

                <span className="text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500">
                  <IconChevron />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
