'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Cor do ícone — o padrão serve pra fundo claro; telas escuras (ex. login) passam outra. */
  iconClassName?: string
}

/** Campo de senha com "olhinho" pra alternar entre texto oculto e visível —
 *  substituto direto de `<input type="password">`, mesmas props. */
export function PasswordInput({ className, iconClassName, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(className, 'pr-10')}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        // Sem a palavra "senha" no aria-label de propósito: testes e2e (e
        // leitores de tela) que localizam o campo por getByLabel(/senha/i)
        // acabavam batendo nesse botão também, não só no input.
        aria-label={visible ? 'Ocultar caracteres digitados' : 'Mostrar caracteres digitados'}
        className={cn(
          'absolute inset-y-0 right-0 flex items-center px-3 transition-colors',
          iconClassName ?? 'text-gray-400 hover:text-gray-600'
        )}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
