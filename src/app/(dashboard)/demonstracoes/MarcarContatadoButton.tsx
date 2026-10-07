'use client'

import { useState, useTransition } from 'react'
import { marcarContatado } from '@/app/actions/demoRequests'

export function MarcarContatadoButton({ id, contatado }: { id: string; contatado: boolean }) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function alternar() {
    setErro(null)
    startTransition(async () => {
      const result = await marcarContatado(id, !contatado)
      if (result.error) setErro(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={alternar}
        disabled={pending}
        className={
          contatado
            ? 'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50'
            : 'rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
        }
      >
        {pending ? 'Salvando…' : contatado ? 'Marcar como pendente' : 'Marcar como contatado'}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
