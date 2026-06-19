export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  ShadingType,
  PageBreak,
  BorderStyle,
  Header,
  Footer,
} from 'docx'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

const LEVEL_HEX: Record<RiskLevel, string> = {
  baixo: '16A34A',
  moderado: 'CA8A04',
  alto: 'EA580C',
  critico: 'DC2626',
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
}

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

function heading(text: string, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 400, after: 160 } })
}

function bodyText(text: string, bold = false, color?: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold, color, size: 22 })],
  })
}

function levelCell(level: RiskLevel) {
  return new TableCell({
    shading: { fill: LEVEL_HEX[level], type: ShadingType.CLEAR, color: 'auto' },
    width: { size: 15, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: LEVEL_LABEL[level], bold: true, color: 'FFFFFF', size: 20 })],
      }),
    ],
  })
}

function headerCell(text: string, widthPct: number) {
  return new TableCell({
    shading: { fill: '1E3A8A', type: ShadingType.CLEAR, color: 'auto' },
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })],
      }),
    ],
  })
}

function dataCell(text: string, widthPct: number, center = false) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autorizado', { status: 401 })

  const assessmentId = request.nextUrl.searchParams.get('assessmentId')
  if (!assessmentId) return new Response('assessmentId ausente', { status: 400 })

  const [{ data: assessment }, { data: scores }, { data: plan }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, mode, cycle, created_at, sectors(name, companies(name))')
      .eq('id', assessmentId)
      .single(),
    supabase.from('risk_scores').select('factor_id, score, level').eq('assessment_id', assessmentId),
    supabase
      .from('action_plans')
      .select('id, actions(description, responsible, due_date, type, risk_level)')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
  ])

  const { data: approvals } = plan
    ? await supabase
        .from('approvals')
        .select('status, approved_by, approved_at, notes')
        .eq('plan_id', plan.id)
        .order('created_at', { ascending: false })
        .limit(1)
    : { data: null }

  if (!assessment) return new Response('Avaliação não encontrada', { status: 404 })

  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'
  const dateStr = new Date(assessment.created_at ?? Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const scoresSorted = [...(scores ?? [])].sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )
  const overallScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel = (scoresSorted[0]?.level ?? 'baixo') as RiskLevel
  const criticalCount = scoresSorted.filter(s => s.level === 'critico').length
  const highCount = scoresSorted.filter(s => s.level === 'alto').length

  const actions = (plan?.actions as {
    description: string; responsible: string; due_date: string | null; type: string; risk_level: string | null
  }[] | null) ?? []

  const actionsSorted = [...actions].sort(
    (a, b) =>
      (RISK_ORDER[(b.risk_level ?? 'baixo') as RiskLevel] ?? 0) -
      (RISK_ORDER[(a.risk_level ?? 'baixo') as RiskLevel] ?? 0),
  )

  // ── Tabela de fatores de risco ────────────────────────────────────────────
  const riskTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('ID', 8),
        headerCell('Fator de Risco', 47),
        headerCell('Dimensão', 20),
        headerCell('Score', 10),
        headerCell('Nível', 15),
      ],
    }),
    ...scoresSorted.map(s => {
      const factor = FACTORS.find(f => f.id === s.factor_id)
      const level = s.level as RiskLevel
      return new TableRow({
        children: [
          dataCell(s.factor_id, 8, true),
          dataCell(factor?.name ?? s.factor_id, 47),
          dataCell(factor?.dimension ?? '—', 20),
          dataCell(`${s.score.toFixed(0)}/100`, 10, true),
          levelCell(level),
        ],
      })
    }),
  ]

  // ── Tabela do plano de ação ───────────────────────────────────────────────
  const actionTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('Ação', 40),
        headerCell('Responsável', 20),
        headerCell('Prazo', 15),
        headerCell('Tipo', 10),
        headerCell('Risco', 15),
      ],
    }),
    ...actionsSorted.map(a => {
      const level = (a.risk_level ?? 'baixo') as RiskLevel
      const dueDate = a.due_date
        ? new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
        : '—'
      return new TableRow({
        children: [
          dataCell(a.description, 40),
          dataCell(a.responsible || '—', 20),
          dataCell(dueDate, 15, true),
          dataCell(a.type, 10, true),
          levelCell(level),
        ],
      })
    }),
  ]

  // ── Documento Word ────────────────────────────────────────────────────────
  const doc = new Document({
    title: `Diagnóstico NR-1 — ${companyName}`,
    description: 'Relatório de Diagnóstico de Riscos Psicossociais — NR-1',
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Diagnóstico de Riscos Psicossociais — NR-1', size: 18, color: '6B7280' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'NR-1 · Portaria MTE nº 1.419/2024 · Guia MTE 2025 · Confidencial', size: 16, color: '9CA3AF' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── Capa ──
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 400 },
            children: [
              new TextRun({ text: 'DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS', bold: true, size: 48, color: '1E3A8A' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'NR-1 · Portaria MTE nº 1.419/2024', size: 28, color: '3B82F6' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: companyName, bold: true, size: 36, color: '111827' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: `Setor: ${sectorName}`, size: 26, color: '6B7280' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({ text: `Modo ${assessment.mode === 'A' ? 'A — Institucional' : 'B — Coleta Anônima'} · Ciclo #${assessment.cycle}`, size: 22, color: '9CA3AF' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            children: [new TextRun({ text: dateStr, size: 22, color: '9CA3AF' })],
          }),

          // ── Quebra de página ──
          new Paragraph({ children: [new PageBreak()] }),

          // ── 1. Resumo Executivo ──
          heading('1. Resumo Executivo'),
          bodyText(
            `Este relatório apresenta os resultados do diagnóstico de riscos psicossociais realizado na empresa ${companyName}, ` +
            `setor ${sectorName}, referente ao ciclo de avaliação #${assessment.cycle}, conduzido em ${dateStr}, ` +
            `em conformidade com a NR-1 (Portaria MTE nº 1.419/2024) e o Guia Prático do MTE 2025.`,
          ),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell('Indicador', 50),
                  headerCell('Resultado', 50),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Score geral de risco (0–100)', 50),
                  dataCell(`${overallScore} — ${LEVEL_LABEL[worstLevel]}`, 50),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Fatores críticos (score > 75)', 50),
                  dataCell(`${criticalCount}`, 50, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Fatores altos (score 51–75)', 50),
                  dataCell(`${highCount}`, 50, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Total de fatores avaliados', 50),
                  dataCell(`${scores?.length ?? 0} de 13`, 50, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Modo de coleta', 50),
                  dataCell(`Modo ${assessment.mode}`, 50),
                ],
              }),
            ],
          }),

          // ── 2. Fatores de Risco ──
          new Paragraph({ children: [new PageBreak()] }),
          heading('2. Fatores de Risco Psicossocial'),
          bodyText(
            'Os 13 fatores de risco psicossocial foram avaliados conforme as dimensões definidas pelo Guia MTE 2025. ' +
            'A tabela abaixo apresenta os resultados ordenados por nível de criticidade.',
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: riskTableRows,
          }),
          bodyText('Escala de classificação: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100)', false, '9CA3AF'),

          // ── 3. Plano de Ação ──
          new Paragraph({ children: [new PageBreak()] }),
          heading('3. Plano de Ação'),
          bodyText(
            `O plano de ação contém ${actionsSorted.length} ação(ões) geradas a partir das intervenções selecionadas. ` +
            'As ações estão ordenadas por criticidade do risco associado.',
          ),
          actionsSorted.length > 0
            ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: actionTableRows })
            : bodyText('Nenhuma ação registrada no plano.', false, '9CA3AF'),

          // ── 4. Metodologia ──
          new Paragraph({ children: [new PageBreak()] }),
          heading('4. Metodologia'),
          bodyText(
            'O diagnóstico foi conduzido com base nos 13 fatores de risco psicossocial definidos pela NR-1 ' +
            '(Portaria MTE nº 1.419/2024) e detalhados no Guia Prático do MTE 2025 (ISO 45003:2021). ' +
            'As 50 questões foram agrupadas pelos fatores e respondidas em escala Likert de 5 pontos.',
          ),
          bodyText(
            'Os scores são normalizados para a escala 0–100, onde valores mais altos indicam maior intensidade ' +
            'do fator de risco. A classificação segue os limiares: Baixo (0–25), Moderado (26–50), Alto (51–75) e Crítico (76–100).',
          ),
          ...(assessment.mode === 'B' ? [
            bodyText(
              'Modo B (Coleta Anônima): as respostas foram coletadas de forma anônima via link seguro, ' +
              'em conformidade com a LGPD. Nenhum dado pessoal foi associado às respostas.',
            ),
          ] : []),

          // ── Aprovação ──
          ...(approvals && approvals.length > 0 && approvals[0] ? [
            new Paragraph({ children: [new PageBreak()] }),
            heading('5. Registro de Aprovação'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [headerCell('Campo', 40), headerCell('Valor', 60)] }),
                new TableRow({ children: [dataCell('Aprovado por', 40), dataCell(approvals[0].approved_by, 60)] }),
                new TableRow({
                  children: [
                    dataCell('Status', 40),
                    dataCell(
                      approvals[0].status === 'aprovado' ? 'Aprovado'
                        : approvals[0].status === 'com_ressalvas' ? 'Aprovado com Ressalvas'
                        : 'Em Revisão',
                      60,
                    ),
                  ],
                }),
                new TableRow({
                  children: [
                    dataCell('Data', 40),
                    dataCell(
                      approvals[0].approved_at
                        ? new Date(approvals[0].approved_at).toLocaleDateString('pt-BR')
                        : '—',
                      60,
                    ),
                  ],
                }),
                ...(approvals[0].notes ? [
                  new TableRow({ children: [dataCell('Observações', 40), dataCell(approvals[0].notes, 60)] }),
                ] : []),
              ],
            }),
          ] : []),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  const filename = `relatorio-nr1-${sectorName}-ciclo${assessment.cycle}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .concat('.docx')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
