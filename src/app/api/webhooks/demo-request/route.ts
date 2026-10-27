import { NextResponse } from 'next/server'

// Disparado pelo gatilho `trg_notify_demo_request` (migration 027) assim que
// alguém solicita demonstração pelo site — pg_net chama esta rota de forma
// assíncrona logo após o insert em `demo_requests`. Autenticação por segredo
// compartilhado (mesmo padrão do webhook da Hotmart), guardado no Supabase
// Vault do lado do banco e aqui como env var.

const DESTINATARIO = 'aerciooliver1@gmail.com'

interface DemoRequestPayload {
  id?: string
  full_name?: string
  email?: string
  whatsapp?: string
  created_at?: string
}

export async function POST(request: Request) {
  const secret = process.env.DEMO_REQUEST_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  const received = request.headers.get('x-demo-request-secret')
  if (received !== secret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let payload: DemoRequestPayload
  try {
    payload = (await request.json()) as DemoRequestPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const { full_name, email, whatsapp } = payload
  const demonstracoesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/demonstracoes`

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && apiKey !== 're_sua_chave_aqui') {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: `DRPS <${process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com'}>`,
        to: DESTINATARIO,
        subject: `Nova solicitação de demonstração — ${full_name ?? 'sem nome'}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">Nova solicitação de demonstração</h2>
            <p>Alguém acabou de preencher o formulário no site:</p>
            <table style="margin:20px 0;border-collapse:collapse">
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Nome</td><td><strong>${full_name ?? '—'}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">E-mail</td><td><strong>${email ?? '—'}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">WhatsApp</td><td><strong>${whatsapp ?? '—'}</strong></td></tr>
            </table>
            <p style="margin:24px 0">
              <a href="${demonstracoesUrl}"
                 style="background:#1e40af;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold">
                Ver em Demonstrações
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">
              Depois de atender, marque como "contatado" na tela de Demonstrações.
            </p>
          </div>
        `,
      })
    } catch {
      // Melhor esforço — a solicitação já está salva em demo_requests de
      // qualquer forma; se o e-mail falhar, ainda aparece em /demonstracoes.
    }
  }

  return NextResponse.json({ received: true })
}
