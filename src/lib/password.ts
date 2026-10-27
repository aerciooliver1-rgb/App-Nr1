import { randomInt } from 'crypto'

// Sem caracteres ambíguos (0/O, 1/l/I) — mais fácil de digitar depois de ler
// num e-mail ou copiar de um celular.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** Senha aleatória (default 8 caracteres), usada no onboarding automático
 *  pós-compra — gerada pelo sistema, nunca escolhida pelo cliente. */
export function generatePassword(length = 8): string {
  let password = ''
  for (let i = 0; i < length; i++) {
    password += CHARSET[randomInt(CHARSET.length)]
  }
  return password
}
