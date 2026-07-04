export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import PptxGenJS from 'pptxgenjs'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

// ─── Paleta ───────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<RiskLevel, string> = {
  baixo:    '16a34a',
  moderado: 'ca8a04',
  alto:     'ea580c',
  critico:  'dc2626',
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto', critico: 'Crítico',
}

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

const DARK  = '0f172a'
const BLUE  = '1e3a8a'
const BLUE2 = '3b82f6'
const LGRAY = 'e2e8f0'
const SGRAY = 'f8fafc'
const TGRAY = '6b7280'
const XGRAY = '9ca3af'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySlide = any

function rect(slide: AnySlide, x: number, y: number, w: number, h: number, color: string) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color },
    line: { color, width: 0.5 },
  })
}

function slideLayout(slide: AnySlide, title: string, context: string) {
  rect(slide, 0, 0, 13.33, 0.56, BLUE)
  slide.addText(title, {
    x: 0.45, y: 0, w: 9, h: 0.56,
    fontSize: 14, bold: true, color: 'ffffff', fontFace: 'Calibri', valign: 'middle',
  })
  slide.addText(context, {
    x: 9.5, y: 0, w: 3.6, h: 0.56,
    fontSize: 8, color: '93c5fd', fontFace: 'Calibri', align: 'right', valign: 'middle',
  })
  rect(slide, 0, 7.28, 13.33, 0.06, LGRAY)
  slide.addText('NR-1 · Portaria MTE nº 1.419/2024 · Guia MTE 2025 · Documento Confidencial', {
    x: 0.4, y: 7.33, w: 12.5, h: 0.18,
    fontSize: 7.5, color: XGRAY, fontFace: 'Calibri', align: 'center',
  })
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autorizado', { status: 401 })

  const assessmentId = request.nextUrl.searchParams.get('assessmentId')
  if (!assessmentId) return new Response('assessmentId ausente', { status: 400 })

  const [{ data: assessment }, { data: scores }, { data: plan }, { data: profile }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, mode, cycle, created_at, sectors(name, companies(name, contact_name))')
      .eq('id', assessmentId)
      .single(),
    supabase
      .from('risk_scores')
      .select('factor_id, score, level')
      .eq('assessment_id', assessmentId),
    supabase
      .from('action_plans')
      .select('id, actions(description, responsible, due_date, type, risk_level)')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, registro_profissional')
      .eq('id', user.id)
      .single(),
  ])

  if (!assessment) return new Response('Avaliação não encontrada', { status: 404 })

  const sector = assessment.sectors as { name: string; companies: { name: string; contact_name: string | null } | null } | null
  const companyName    = sector?.companies?.name ?? 'Empresa'
  const sectorName     = sector?.name ?? 'Setor'
  const managerName    = sector?.companies?.contact_name ?? ''
  const professionalName = profile?.full_name ?? (user.user_metadata?.name as string | undefined) ?? ''
  const professionalReg  = profile?.registro_profissional ?? ''
  const dateLabel   = new Date(assessment.created_at ?? Date.now())
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const sorted = [...(scores ?? [])].sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )
  const overallScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel: RiskLevel = (sorted[0]?.level ?? 'baixo') as RiskLevel
  const criticalCount = sorted.filter(s => s.level === 'critico').length
  const highCount     = sorted.filter(s => s.level === 'alto').length
  const priorityScores = sorted.filter(s => s.level === 'critico' || s.level === 'alto')

  const actions = (plan?.actions as {
    description: string; responsible: string; due_date: string | null
    type: string; risk_level: string | null
  }[] | null) ?? []
  const actionsSorted = [...actions].sort(
    (a, b) => (RISK_ORDER[(b.risk_level ?? 'baixo') as RiskLevel] ?? 0) -
              (RISK_ORDER[(a.risk_level ?? 'baixo') as RiskLevel] ?? 0),
  )

  const ctx = `${companyName} · ${sectorName} · Ciclo #${assessment.cycle}`

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title  = `Diagnóstico NR-1 — ${companyName}`

  // ── Slide 1: Capa ────────────────────────────────────────────────────────────
  const s1 = pptx.addSlide()
  s1.background = { color: DARK }

  // Faixa de cor no topo (indica nível de risco)
  rect(s1, 0, 0, 13.33, 0.18, LEVEL_COLOR[worstLevel])

  // Subtítulo
  s1.addText('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS', {
    x: 0.6, y: 1.1, w: 12.1, h: 0.6,
    fontSize: 19, bold: false, color: XGRAY, fontFace: 'Calibri',
    align: 'center', charSpacing: 3,
  })

  // Nome da empresa (destaque)
  s1.addText(companyName, {
    x: 0.6, y: 1.75, w: 12.1, h: 1.0,
    fontSize: 40, bold: true, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })

  // Divisor azul
  rect(s1, 3.0, 2.9, 7.33, 0.05, BLUE2)

  // Setor
  s1.addText(`Setor: ${sectorName}`, {
    x: 0.6, y: 3.05, w: 12.1, h: 0.5,
    fontSize: 17, color: '93c5fd', fontFace: 'Calibri', align: 'center',
  })

  // Badge de nível de risco
  rect(s1, 4.8, 4.1, 3.7, 0.62, LEVEL_COLOR[worstLevel])
  s1.addText(`RISCO ${LEVEL_LABEL[worstLevel].toUpperCase()}  ·  SCORE ${overallScore}/100`, {
    x: 4.8, y: 4.1, w: 3.7, h: 0.62,
    fontSize: 14, bold: true, color: 'ffffff', fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  })

  // Dados do ciclo
  s1.addText(
    `Ciclo #${assessment.cycle}  ·  ${dateLabel}  ·  Modo ${assessment.mode === 'A' ? 'A — Institucional' : 'B — Coleta Anônima'}`,
    {
      x: 0.6, y: 5.5, w: 12.1, h: 0.4,
      fontSize: 10.5, color: '475569', fontFace: 'Calibri', align: 'center',
    },
  )

  // Rodapé
  rect(s1, 0, 7.1, 13.33, 0.4, '020617')
  s1.addText(
    'NR-1  ·  Portaria MTE nº 1.419/2024  ·  ISO 45003:2021  ·  Lei 13.709/2018  ·  CONFIDENCIAL',
    {
      x: 0.4, y: 7.1, w: 12.5, h: 0.4,
      fontSize: 8, color: '334155', fontFace: 'Calibri', align: 'center', valign: 'middle',
    },
  )

  // ── Slide 2: Resumo Executivo ────────────────────────────────────────────────
  const s2 = pptx.addSlide()
  slideLayout(s2, 'RESUMO EXECUTIVO', ctx)

  // Caixa de score (esquerda)
  rect(s2, 0.45, 0.75, 3.1, 5.8, LEVEL_COLOR[worstLevel])

  s2.addText(String(overallScore), {
    x: 0.45, y: 1.25, w: 3.1, h: 1.4,
    fontSize: 80, bold: true, color: 'ffffff', fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  })
  s2.addText('Score Geral', {
    x: 0.45, y: 2.6, w: 3.1, h: 0.38,
    fontSize: 11, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })
  rect(s2, 0.75, 3.02, 2.5, 0.04, 'ffffff')
  s2.addText(LEVEL_LABEL[worstLevel].toUpperCase(), {
    x: 0.45, y: 3.12, w: 3.1, h: 0.55,
    fontSize: 20, bold: true, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })
  s2.addText('de 100', {
    x: 0.45, y: 3.8, w: 3.1, h: 0.35,
    fontSize: 10, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })

  // Contadores crítico/alto
  const hasAlert = criticalCount > 0 || highCount > 0
  if (hasAlert) {
    rect(s2, 0.55, 4.6, 2.9, 0.04, criticalCount > 0 ? 'fca5a5' : 'fdba74')
    s2.addText(
      criticalCount > 0
        ? `${criticalCount} fator${criticalCount > 1 ? 'es' : ''} CRÍTICO${criticalCount > 1 ? 'S' : ''}`
        : `${highCount} fator${highCount > 1 ? 'es' : ''} ALTO${highCount > 1 ? 'S' : ''}`,
      {
        x: 0.45, y: 4.68, w: 3.1, h: 0.38,
        fontSize: 11, bold: true,
        color: criticalCount > 0 ? 'fca5a5' : 'fdba74',
        fontFace: 'Calibri', align: 'center',
      },
    )
  }

  // Tabela de indicadores (direita)
  s2.addTable(
    [
      [
        { text: 'INDICADOR', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 10, fontFace: 'Calibri' } },
        { text: 'RESULTADO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 10, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Nível de risco geral', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: LEVEL_LABEL[worstLevel], options: { bold: true, fontSize: 11, color: LEVEL_COLOR[worstLevel], align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Score geral (escala 0–100)', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: `${overallScore}/100`, options: { bold: true, fontSize: 11, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Fatores críticos (score > 75)', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: String(criticalCount), options: { bold: true, fontSize: 12, color: criticalCount > 0 ? 'dc2626' : TGRAY, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Fatores altos (score 51–75)', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: String(highCount), options: { bold: true, fontSize: 12, color: highCount > 0 ? 'ea580c' : TGRAY, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Total de fatores avaliados', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: `${scores?.length ?? 0} de 13`, options: { fontSize: 11, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Modo de coleta', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: `Modo ${assessment.mode} — ${assessment.mode === 'A' ? 'Institucional' : 'Anônima'}`, options: { fontSize: 11, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Ciclo de avaliação', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: `#${assessment.cycle}`, options: { fontSize: 11, align: 'center' as const, fontFace: 'Calibri' } },
      ],
      [
        { text: 'Data de avaliação', options: { fontSize: 11, fontFace: 'Calibri' } },
        { text: dateLabel, options: { fontSize: 11, fontFace: 'Calibri' } },
      ],
    ],
    {
      x: 3.85, y: 0.75, w: 9.05, colW: [5.9, 3.15],
      border: { type: 'solid', color: LGRAY, pt: 1 },
      rowH: 0.48, fontSize: 11, fontFace: 'Calibri',
    },
  )

  s2.addText(
    'Classificação: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100)',
    {
      x: 0.4, y: 6.88, w: 12.5, h: 0.3,
      fontSize: 8.5, color: XGRAY, align: 'center', italic: true, fontFace: 'Calibri',
    },
  )

  // ── Slide 3: Panorama de Risco ───────────────────────────────────────────────
  const s3 = pptx.addSlide()
  slideLayout(s3, 'PANORAMA DE RISCO PSICOSSOCIAL', `${sectorName} · ${sorted.length} fatores avaliados`)

  // Cabeçalho das colunas
  s3.addText('Fator de Risco', {
    x: 0.45, y: 0.63, w: 3.6, h: 0.24,
    fontSize: 8, bold: true, color: TGRAY, fontFace: 'Calibri',
  })
  s3.addText('Score  (0 ──────────── 100)', {
    x: 4.3, y: 0.63, w: 7.5, h: 0.24,
    fontSize: 8, bold: true, color: TGRAY, fontFace: 'Calibri', align: 'center',
  })
  s3.addText('Nível', {
    x: 12.0, y: 0.63, w: 1.1, h: 0.24,
    fontSize: 8, bold: true, color: TGRAY, fontFace: 'Calibri', align: 'center',
  })
  rect(s3, 0.45, 0.88, 12.7, 0.025, LGRAY)

  const ROW_H      = 0.455
  const ROW_START  = 0.92
  const BAR_X      = 4.3
  const BAR_MAX_W  = 7.5
  const BAR_H      = 0.17

  sorted.forEach((s, i) => {
    const factor = FACTORS.find(f => f.id === s.factor_id)
    const level  = s.level as RiskLevel
    const color  = LEVEL_COLOR[level]
    const score  = s.score
    const rowY   = ROW_START + i * ROW_H
    const barY   = rowY + (ROW_H - BAR_H) / 2
    const barW   = Math.max(0.08, BAR_MAX_W * (score / 100))

    // Zebra stripe
    if (i % 2 === 1) rect(s3, 0, rowY, 13.33, ROW_H, SGRAY)

    // Nome do fator
    s3.addText(
      [
        { text: `${s.factor_id}  `, options: { fontSize: 7, color: XGRAY } },
        { text: factor?.name ?? s.factor_id, options: { fontSize: 9, color: '111827' } },
      ],
      { x: 0.45, y: rowY + 0.05, w: 3.7, h: ROW_H - 0.1, valign: 'middle', fontFace: 'Calibri' },
    )

    // Track (fundo cinza)
    rect(s3, BAR_X, barY, BAR_MAX_W, BAR_H, LGRAY)

    // Fill (cor do nível)
    rect(s3, BAR_X, barY, barW, BAR_H, color)

    // Score
    s3.addText(`${score.toFixed(0)}`, {
      x: 11.85, y: rowY, w: 0.7, h: ROW_H,
      fontSize: 9, bold: true, color: '374151',
      fontFace: 'Calibri', align: 'center', valign: 'middle',
    })

    // Nível badge (mini tabela para garantir background colorido)
    s3.addTable(
      [[{ text: LEVEL_LABEL[level], options: { bold: true, color: 'ffffff', fill: { color }, fontSize: 7.5, align: 'center' as const, valign: 'middle' as const, fontFace: 'Calibri' } }]],
      { x: 12.6, y: rowY + 0.09, w: 0.65, h: ROW_H - 0.18, border: { pt: 0, color } },
    )
  })

  // ── Slide 4: Fatores Prioritários (somente críticos e altos) ─────────────────
  if (priorityScores.length > 0) {
    const s4 = pptx.addSlide()
    slideLayout(s4, 'FATORES PRIORITÁRIOS', `${criticalCount} crítico${criticalCount !== 1 ? 's' : ''} · ${highCount} alto${highCount !== 1 ? 's' : ''}`)

    const headerBg = criticalCount > 0 ? LEVEL_COLOR['critico'] : LEVEL_COLOR['alto']

    s4.addTable(
      [
        [
          { text: 'ID', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'FATOR DE RISCO', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'DIMENSÃO', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'SCORE', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'NÍVEL', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'CONSEQUÊNCIA', options: { bold: true, color: 'ffffff', fill: { color: headerBg }, fontSize: 10, fontFace: 'Calibri' } },
        ],
        ...priorityScores.map(s => {
          const factor = FACTORS.find(f => f.id === s.factor_id)
          const level  = s.level as RiskLevel
          const color  = LEVEL_COLOR[level]
          return [
            { text: s.factor_id, options: { align: 'center' as const, fontSize: 9, color: TGRAY, fontFace: 'Calibri' } },
            { text: factor?.name ?? s.factor_id, options: { bold: true, fontSize: 10, color: '111827', fontFace: 'Calibri' } },
            { text: factor?.dimension ?? '—', options: { fontSize: 9, color: TGRAY, fontFace: 'Calibri' } },
            { text: `${s.score.toFixed(0)}/100`, options: { align: 'center' as const, bold: true, fontSize: 10, color: '111827', fontFace: 'Calibri' } },
            { text: LEVEL_LABEL[level], options: { align: 'center' as const, bold: true, fontSize: 10, color: 'ffffff', fill: { color }, fontFace: 'Calibri' } },
            { text: factor?.consequence ?? '—', options: { fontSize: 9, color: '6b7280', fontFace: 'Calibri' } },
          ]
        }),
      ],
      {
        x: 0.45, y: 0.72, w: 12.5, colW: [0.7, 3.5, 2.8, 1.0, 1.1, 3.4],
        border: { type: 'solid', color: LGRAY, pt: 1 },
        rowH: Math.min(0.52, 5.9 / (priorityScores.length + 1)),
        fontSize: 10, fontFace: 'Calibri',
      },
    )

    s4.addText(
      'Fatores prioritários requerem ação imediata. Consulte o Plano de Ação para as intervenções recomendadas.',
      {
        x: 0.45, y: 6.85, w: 12.5, h: 0.32,
        fontSize: 8.5, color: XGRAY, italic: true, fontFace: 'Calibri', align: 'center',
      },
    )
  }

  // ── Slide 5: Plano de Ação ───────────────────────────────────────────────────
  const s5 = pptx.addSlide()
  slideLayout(s5, 'PLANO DE AÇÃO', `${actionsSorted.length} ação${actionsSorted.length !== 1 ? 'ões' : ''}`)

  if (actionsSorted.length === 0) {
    s5.addText('Nenhuma ação registrada no plano.', {
      x: 0.4, y: 3.5, w: 12.5, h: 0.6, fontSize: 13, color: XGRAY, align: 'center', fontFace: 'Calibri',
    })
  } else {
    const actionRows = actionsSorted.slice(0, 13).map(a => {
      const level = (a.risk_level ?? 'baixo') as RiskLevel
      const color = LEVEL_COLOR[level]
      const due   = a.due_date
        ? new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
        : '—'
      return [
        { text: a.description, options: { fontSize: 9.5, color: '111827', fontFace: 'Calibri' } },
        { text: a.responsible || '—', options: { fontSize: 9.5, color: TGRAY, fontFace: 'Calibri' } },
        { text: due, options: { fontSize: 9.5, align: 'center' as const, color: TGRAY, fontFace: 'Calibri' } },
        { text: a.type === 'corretiva' ? 'Corretiva' : 'Preventiva', options: { fontSize: 9.5, align: 'center' as const, color: TGRAY, fontFace: 'Calibri' } },
        { text: LEVEL_LABEL[level], options: { fontSize: 9.5, align: 'center' as const, bold: true, color: 'ffffff', fill: { color }, fontFace: 'Calibri' } },
      ]
    })

    s5.addTable(
      [
        [
          { text: 'AÇÃO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'RESPONSÁVEL', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'PRAZO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'TIPO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
          { text: 'RISCO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, align: 'center' as const, fontSize: 10, fontFace: 'Calibri' } },
        ],
        ...actionRows,
      ],
      {
        x: 0.45, y: 0.72, w: 12.5, colW: [5.1, 2.8, 1.4, 1.5, 1.7],
        border: { type: 'solid', color: LGRAY, pt: 1 },
        rowH: Math.min(0.48, 5.9 / (Math.min(actionsSorted.length, 13) + 1)),
        fontSize: 10, fontFace: 'Calibri',
      },
    )

    if (actionsSorted.length > 13) {
      s5.addText(`+ ${actionsSorted.length - 13} ação(ões) adicionais constam no plano completo.`, {
        x: 0.45, y: 7.0, w: 12.5, h: 0.25,
        fontSize: 8.5, color: XGRAY, italic: true, fontFace: 'Calibri',
      })
    }
  }

  // ── Slide 6: Metodologia ────────────────────────────────────────────────────
  const s6 = pptx.addSlide()
  slideLayout(s6, 'METODOLOGIA', 'NR-1 · Guia MTE 2025')

  const topics: [string, string][] = [
    ['Base Legal', 'NR-1 (Portaria MTE nº 1.419/2024) e Guia Prático do MTE 2025, alinhado à ISO 45003:2021.'],
    ['Fatores Avaliados', '13 fatores de risco psicossocial organizados em dimensões: organização do trabalho, relações interpessoais, papel e clareza, liderança, carga e ritmo de trabalho, autonomia, segurança e futuro.'],
    ['Instrumento', `50 questões em escala Likert de 5 pontos, agrupadas por fator. Modo de aplicação: Modo ${assessment.mode === 'A' ? 'A — aplicação institucional presencial ou remota' : 'B — coleta anônima via link seguro (conformidade LGPD)'}.`],
    ['Cálculo de Score', 'Scores normalizados para a escala 0–100. Valores mais altos indicam maior intensidade do fator de risco. Escala: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100).'],
    ['Plano de Ação', 'Intervenções selecionadas do catálogo de programas NR-1 e transformadas em ações com responsável, prazo e tipo (preventiva/corretiva), conforme criticidade do fator.'],
  ]

  topics.forEach(([title, body], i) => {
    const y = 0.78 + i * 1.08

    rect(s6, 0.45, y, 0.08, 0.85, BLUE2)

    s6.addText(title, {
      x: 0.65, y: y + 0.04, w: 12.3, h: 0.28,
      fontSize: 11, bold: true, color: BLUE, fontFace: 'Calibri',
    })
    s6.addText(body, {
      x: 0.65, y: y + 0.32, w: 12.3, h: 0.56,
      fontSize: 9.5, color: '374151', fontFace: 'Calibri',
    })
  })

  // ── Slide 7: Assinaturas ─────────────────────────────────────────────────────
  const s7 = pptx.addSlide()
  s7.background = { color: DARK }
  rect(s7, 0, 0, 13.33, 0.18, LEVEL_COLOR[worstLevel])

  s7.addText('ASSINATURAS', {
    x: 0.45, y: 0.35, w: 12.5, h: 0.38,
    fontSize: 9, bold: true, color: '94a3b8', fontFace: 'Calibri',
    charSpacing: 2, align: 'center',
  })
  s7.addText('Diagnóstico de Riscos Psicossociais — NR-1', {
    x: 0.45, y: 0.73, w: 12.5, h: 0.32,
    fontSize: 14, bold: true, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })
  s7.addText(`${companyName}  ·  Setor: ${sectorName}  ·  Ciclo #${assessment.cycle}  ·  ${dateLabel}`, {
    x: 0.45, y: 1.05, w: 12.5, h: 0.32,
    fontSize: 9, color: '475569', fontFace: 'Calibri', align: 'center',
  })

  // Caixa esquerda: Profissional Responsável
  rect(s7, 0.45, 1.55, 6.0, 4.0, '0d1a2f')
  s7.addTable(
    [[{ text: 'RESPONSÁVEL PELA ELABORAÇÃO', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 9, fontFace: 'Calibri' } }]],
    { x: 0.45, y: 1.55, w: 6.0, border: { pt: 0, color: BLUE } },
  )
  // Área de assinatura (linha)
  rect(s7, 0.85, 2.15, 5.2, 0.02, '1e3a8a')
  s7.addText('Assinatura', {
    x: 0.85, y: 2.18, w: 5.2, h: 0.22,
    fontSize: 7.5, color: '475569', fontFace: 'Calibri', align: 'center',
  })
  rect(s7, 0.85, 2.9, 5.2, 0.02, '334155')
  s7.addText(professionalName || '_____________________________', {
    x: 0.85, y: 2.94, w: 5.2, h: 0.3,
    fontSize: 10, bold: true, color: 'e2e8f0', fontFace: 'Calibri', align: 'center',
  })
  s7.addText(professionalReg || 'Registro Profissional', {
    x: 0.85, y: 3.24, w: 5.2, h: 0.22,
    fontSize: 8, color: '64748b', fontFace: 'Calibri', align: 'center',
  })
  s7.addText('Profissional de Saúde Ocupacional', {
    x: 0.85, y: 3.46, w: 5.2, h: 0.22,
    fontSize: 8, color: '475569', fontFace: 'Calibri', align: 'center',
  })
  rect(s7, 0.85, 4.18, 3.0, 0.02, '1e3a8a')
  s7.addText('Data:', {
    x: 0.85, y: 4.21, w: 1.0, h: 0.24,
    fontSize: 8, color: '64748b', fontFace: 'Calibri',
  })

  // Caixa direita: Gestor / Responsável pela Empresa
  rect(s7, 6.85, 1.55, 6.0, 4.0, '0d1a2f')
  s7.addTable(
    [[{ text: 'RESPONSÁVEL PELA EMPRESA', options: { bold: true, color: 'ffffff', fill: { color: BLUE }, fontSize: 9, fontFace: 'Calibri' } }]],
    { x: 6.85, y: 1.55, w: 6.0, border: { pt: 0, color: BLUE } },
  )
  rect(s7, 7.25, 2.15, 5.2, 0.02, '1e3a8a')
  s7.addText('Assinatura', {
    x: 7.25, y: 2.18, w: 5.2, h: 0.22,
    fontSize: 7.5, color: '475569', fontFace: 'Calibri', align: 'center',
  })
  rect(s7, 7.25, 2.9, 5.2, 0.02, '334155')
  s7.addText(managerName || '_____________________________', {
    x: 7.25, y: 2.94, w: 5.2, h: 0.3,
    fontSize: 10, bold: true, color: 'e2e8f0', fontFace: 'Calibri', align: 'center',
  })
  s7.addText('Gestor / Representante Legal', {
    x: 7.25, y: 3.24, w: 5.2, h: 0.22,
    fontSize: 8, color: '64748b', fontFace: 'Calibri', align: 'center',
  })
  s7.addText('Responsável pela Aprovação', {
    x: 7.25, y: 3.46, w: 5.2, h: 0.22,
    fontSize: 8, color: '475569', fontFace: 'Calibri', align: 'center',
  })
  rect(s7, 7.25, 4.18, 3.0, 0.02, '1e3a8a')
  s7.addText('Data:', {
    x: 7.25, y: 4.21, w: 1.0, h: 0.24,
    fontSize: 8, color: '64748b', fontFace: 'Calibri',
  })

  // Nota Gov.br
  rect(s7, 0.45, 5.8, 12.5, 0.8, '0a1628')
  s7.addText('ASSINATURA DIGITAL GOV.BR', {
    x: 0.55, y: 5.85, w: 3.5, h: 0.22,
    fontSize: 8, bold: true, color: '3b82f6', fontFace: 'Calibri',
  })
  s7.addText(
    'Este documento está habilitado para assinatura digital qualificada via Gov.br (Decreto nº 8.771/2016 · Lei nº 14.063/2020). ' +
    'Acesse assinatura.iti.br, faça login com CPF e senha Gov.br, carregue este PDF e assine digitalmente.',
    {
      x: 0.55, y: 6.08, w: 12.3, h: 0.46,
      fontSize: 7.5, color: '64748b', fontFace: 'Calibri',
    },
  )

  rect(s7, 0, 7.1, 13.33, 0.4, '020617')
  s7.addText(
    'NR-1  ·  Portaria MTE nº 1.419/2024  ·  ISO 45003:2021  ·  Lei 13.709/2018  ·  CONFIDENCIAL',
    {
      x: 0.4, y: 7.1, w: 12.5, h: 0.4,
      fontSize: 8, color: '334155', fontFace: 'Calibri', align: 'center', valign: 'middle',
    },
  )

  // ── Slide 8: Encerramento ────────────────────────────────────────────────────
  const s8 = pptx.addSlide()
  s8.background = { color: DARK }

  rect(s8, 0, 0, 13.33, 0.18, LEVEL_COLOR[worstLevel])

  s8.addText('Diagnóstico concluído', {
    x: 0.6, y: 1.6, w: 12.1, h: 0.6,
    fontSize: 28, bold: true, color: 'ffffff', fontFace: 'Calibri', align: 'center',
  })

  rect(s8, 3.5, 2.35, 6.3, 0.05, BLUE2)

  s8.addText(companyName, {
    x: 0.6, y: 2.5, w: 12.1, h: 0.55,
    fontSize: 22, bold: false, color: '93c5fd', fontFace: 'Calibri', align: 'center',
  })
  s8.addText(`Setor: ${sectorName}  ·  Ciclo #${assessment.cycle}  ·  ${dateLabel}`, {
    x: 0.6, y: 3.1, w: 12.1, h: 0.4,
    fontSize: 12, color: '475569', fontFace: 'Calibri', align: 'center',
  })

  // Score no encerramento
  rect(s8, 5.0, 4.2, 3.3, 1.05, LEVEL_COLOR[worstLevel])
  s8.addText(`Score ${overallScore}/100  ·  ${LEVEL_LABEL[worstLevel]}`, {
    x: 5.0, y: 4.2, w: 3.3, h: 1.05,
    fontSize: 15, bold: true, color: 'ffffff', fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  })

  rect(s8, 0, 7.1, 13.33, 0.4, '020617')
  s8.addText(
    'NR-1  ·  Portaria MTE nº 1.419/2024  ·  ISO 45003:2021  ·  Lei 13.709/2018  ·  CONFIDENCIAL',
    {
      x: 0.4, y: 7.1, w: 12.5, h: 0.4,
      fontSize: 8, color: '334155', fontFace: 'Calibri', align: 'center', valign: 'middle',
    },
  )

  // ── Gerar buffer ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (pptx as any).write('arraybuffer') as ArrayBuffer

  const filename = `diagnostico-nr1-${sectorName}-ciclo${assessment.cycle}-${new Date().toISOString().split('T')[0]}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .concat('.pptx')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
