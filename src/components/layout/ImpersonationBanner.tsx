import { stopImpersonation } from '@/app/actions/impersonation'

export function ImpersonationBanner({
  superadminName,
  targetName,
}: {
  superadminName: string
  targetName: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <span>
        {superadminName} está navegando como <strong>{targetName}</strong> (modo suporte)
      </span>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          Voltar para minha conta
        </button>
      </form>
    </div>
  )
}
