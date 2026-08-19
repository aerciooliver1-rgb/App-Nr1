'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'

const nav = [
  { href: '/dashboard',     label: 'Dashboard',    icon: 'grid'     },
  { href: '/empresas',      label: 'Empresas',     icon: 'building' },
  { href: '/relatorios',    label: 'Relatórios',   icon: 'chart'    },
  { href: '/catalogo',      label: 'Catálogo',     icon: 'catalog'  },
  { href: '/privacidade',   label: 'Privacidade',  icon: 'shield'   },
  { href: '/configuracoes', label: 'Configurações',icon: 'settings' },
]

const superadminNav = [
  { href: '/contas', label: 'Contas', icon: 'accounts' },
]

function NavIcon({ name }: { name: string }) {
  const props = {
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-4 w-4 shrink-0',
  }

  if (name === 'grid') return (
    <svg {...props}>
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  )
  if (name === 'building') return (
    <svg {...props}>
      <path d="M3 18V7.5L10 3l7 4.5V18" />
      <path d="M7.5 18v-5h5v5" />
      <path d="M7.5 9h5" />
    </svg>
  )
  if (name === 'chart') return (
    <svg {...props}>
      <path d="M2 16l4-5 4 2.5 4-7 4 4" />
      <path d="M2 18h16" />
    </svg>
  )
  if (name === 'catalog') return (
    <svg {...props}>
      <path d="M4 4h12v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      <path d="M8 4V2M12 4V2" />
      <path d="M7 9h6M7 12h4" />
    </svg>
  )
  if (name === 'shield') return (
    <svg {...props}>
      <path d="M10 2l6.5 2.5v5.5c0 4-3.5 7-6.5 8-3-1-6.5-4-6.5-8V4.5L10 2z" />
      <path d="M7.5 10l2 2 3-3" />
    </svg>
  )
  if (name === 'settings') return (
    <svg {...props}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.22 4.22l1.76 1.76M14.02 14.02l1.76 1.76M15.78 4.22l-1.76 1.76M5.98 14.02l-1.76 1.76" />
    </svg>
  )
  if (name === 'accounts') return (
    <svg {...props}>
      <circle cx="7" cy="6" r="2.5" />
      <circle cx="14" cy="6" r="2.5" />
      <path d="M2.5 17v-1a4.5 4.5 0 019 0v1" />
      <path d="M11 12.5a4.5 4.5 0 016.5 4v.5" />
    </svg>
  )
  if (name === 'logout') return (
    <svg {...props}>
      <path d="M12 10H3M3 10l3-3M3 10l3 3" />
      <path d="M8 7V5a1 1 0 011-1h6a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1v-2" />
    </svg>
  )
  return null
}

export function Sidebar({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const pathname = usePathname()
  const items = isSuperadmin ? [...nav, ...superadminNav] : nav

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
          <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M10 2l6.5 2.5v5.5c0 4-3.5 7-6.5 8-3-1-6.5-4-6.5-8V4.5L10 2z" />
            <path d="M7.5 10l2 2 3-3" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-white">DRPS</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Riscos Psicossociais
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
        {items.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <NavIcon name={icon} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800 p-2">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
          >
            <NavIcon name="logout" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
