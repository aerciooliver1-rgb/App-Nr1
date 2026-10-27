import { PLAN_LABELS, type PlanId } from '@/lib/hotmart'

/** E-mail com e-mail/senha de acesso — melhor esforço, nunca lança erro
 *  (quem chama decide o que fazer se `false`: webhook registra em
 *  audit_logs, ação de reenvio devolve erro pra UI).
 *
 *  `retry=true` é usado pelo botão "Reenviar credenciais" no Changelog,
 *  depois de uma falha de envio — muda o texto pra deixar claro que a
 *  conta já existe e só a senha mudou de novo, sem soar como um segundo
 *  cadastro. */
export interface SendResult {
  ok: boolean
  /** Motivo da falha, pra registrar no audit_logs — nunca a senha. */
  error?: string
}

export async function sendWelcomeEmail(
  email: string,
  fullName: string,
  password: string,
  plan: PlanId,
  retry = false,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_sua_chave_aqui') return { ok: false, error: 'RESEND_API_KEY não configurada' }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  const intro = retry
    ? `<p>Pedimos desculpas: houve uma falha técnica ao enviar seu acesso logo após a compra.
         Mas fica tranquilo(a) — <strong>seu cadastro já foi criado e seu plano
         ${PLAN_LABELS[plan]} já está ativo</strong>. Seguem seus dados de acesso atualizados:</p>`
    : `<p>Seu pagamento do plano <strong>${PLAN_LABELS[plan]}</strong> foi aprovado e sua conta
         já está ativa. Seus dados de acesso:</p>`

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com',
      to: email,
      subject: retry ? 'Seus dados de acesso ao DRPS (reenvio)' : 'Seu acesso ao DRPS está liberado!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e40af">${retry ? 'Seus dados de acesso — DRPS' : 'Bem-vindo(a) ao DRPS'}</h2>
          <p>Olá, <strong>${fullName}</strong>,</p>
          ${intro}
          <table style="margin:20px 0;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">E-mail</td><td><strong>${email}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Senha</td><td><strong>${password}</strong></td></tr>
          </table>
          <p style="margin:24px 0">
            <a href="${loginUrl}"
               style="background:#1e40af;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold">
              Entrar na plataforma
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">
            Por segurança, recomendamos trocar essa senha depois do primeiro acesso, em
            Configurações → Perfil, ou pelo link "Esqueci minha senha" na tela de login.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="color:#9ca3af;font-size:12px">
            Sistema de Gestão de Riscos Psicossociais — NR-1 / Portaria MTE nº 1.419/2024
          </p>
        </div>
      `,
    })
    if (error) return { ok: false, error: error.message ?? JSON.stringify(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
