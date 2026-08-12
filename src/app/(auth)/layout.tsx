export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">

      {/* ── Painel esquerdo — editorial ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-slate-900 px-12 py-10 xl:px-16 xl:py-12">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
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

        {/* Headline + corpo */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400">
              NR-1 · Portaria MTE nº 1.419/2024
            </p>
            <h1 className="text-4xl font-bold leading-[1.15] text-white xl:text-5xl">
              Avalie os riscos.
              <br />
              Aplique intervenções.
              <br />
              <span className="mt-1 inline-block rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 pb-1 pt-0.5 shadow-lg shadow-blue-500/30">
                Entregue cuidado.
              </span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-400">
              Cumprir a NR-1 é só o começo. O DRPS transforma o diagnóstico dos 13
              fatores em um plano estruturado de saúde mental e bem-estar — que faz
              sentido para a liderança, para as equipes e para a realidade da empresa.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-10 border-t border-slate-800 pt-8">
            <div>
              <p className="text-2xl font-bold text-white">13</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Fatores Avaliados
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">50</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Questões Validadas
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">LGPD</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Conformidade
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé legal */}
        <p className="text-[11px] text-slate-600">
          Portaria MTE nº 1.419/2024 · ISO 45003:2021 · Lei 13.709/2018
        </p>
      </div>

      {/* ── Painel direito — formulário ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-800 px-8 py-12">

        {/* Logo mobile */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
            <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M10 2l6.5 2.5v5.5c0 4-3.5 7-6.5 8-3-1-6.5-4-6.5-8V4.5L10 2z" />
              <path d="M7.5 10l2 2 3-3" />
            </svg>
          </div>
          <p className="text-sm font-bold text-white">DRPS — Diagnósticos de Riscos Psicossociais</p>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>

        {/* Nota LGPD */}
        <div className="mt-10 flex items-center gap-2 text-[11px] text-slate-500">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
            <path d="M8 1.5l5 2v4c0 3-2.5 5.5-5 6.5C5.5 13 3 10.5 3 7.5v-4l5-2z" />
          </svg>
          Acesso restrito · Dados protegidos conforme LGPD
        </div>
      </div>

    </div>
  )
}
