'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/empresas', label: 'Empresas', icon: '🏢' },
  { href: '/relatorios', label: 'Relatórios', icon: '📊' },
  { href: '/catalogo', label: 'Catálogo', icon: '📋' },
  { href: '/privacidade', label: 'Privacidade', icon: '🔒' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-sm font-bold text-gray-900">NR-1 Psicossocial</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {nav.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <span className="text-base">↩</span>
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
