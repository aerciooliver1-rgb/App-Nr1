import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function validateCNPJ(cnpj: string): boolean {
  const stripped = cnpj.replace(/\D/g, '')
  if (stripped.length !== 14) return false
  if (/^(\d)\1+$/.test(stripped)) return false

  const calcDigit = (cnpj: string, length: number) => {
    let sum = 0
    let pos = length - 7
    for (let i = length; i >= 1; i--) {
      sum += parseInt(cnpj.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result
  }

  if (calcDigit(stripped, 12) !== parseInt(stripped.charAt(12))) return false
  if (calcDigit(stripped, 13) !== parseInt(stripped.charAt(13))) return false
  return true
}

export function formatCNPJ(cnpj: string): string {
  const stripped = cnpj.replace(/\D/g, '')
  return stripped.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}
