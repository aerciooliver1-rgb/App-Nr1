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
        <div className="mb-4">
          <input
            type="search"
            placeholder="Buscar empresa ou CNPJ…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Nenhuma empresa encontrada para &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="w-1 pl-0" />
                <th className="px-5 py-3 font-medium text-gray-500">Empresa</th>
                <th className="px-5 py-3 font-medium text-gray-500">CNPJ</th>
                <th className="px-5 py-3 font-medium text-gray-500">Setores</th>
                <th className="px-5 py-3 font-medium text-gray-500">Risco</th>
                <th className="px-5 py-3 font-medium text-gray-500">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(company => (
                <tr
                  key={company.id}
                  className={`border-l-4 transition-colors hover:bg-gray-50 ${
                    company.risk ? RISK_STRIPE[company.risk] : 'border-l-transparent'
                  }`}
                >
                  <td className="w-0 p-0" />
                  <td className="px-5 py-4">
                    <Link
                      href={`/empresas/${company.id}`}
                      className="font-semibold text-gray-900 transition-colors hover:text-blue-600"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-400">
                    {company.cnpj ?? '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-semibold text-gray-600">
                      {company.sectorCount}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {company.risk ? <RiskBadge level={company.risk} /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {formatDate(company.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
