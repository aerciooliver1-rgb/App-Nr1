export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import PptxGenJS from 'pptxgenjs'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

const LEVEL_COLORS: Record<RiskLevel, string> = {
  baixo: '16a34a',
  moderado: 'ca8a04',
  alto: 'ea580c',
  critico: 'dc2626',
}

const LEVEL_LABELS: Record<RiskLevel, string> = {
  baixo: 'BAIXO',
  moderado: 'MODERADO',
  alto: 'ALTO',
  critico: 'CRÍTICO',
}

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

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
    supabase
      .from('risk_scores')
      .select('factor_id, score, level')
      .eq('assessment_id', assessmentId),
    supabase
      .from('action_plans')
      .select('id, actions(description, responsible, due_date, type, risk_level)')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
  ])

  if (!assessment) return new Response('Avaliação não encontrada', { status: 404 })

  const sector = assessment.sectors as { name: string; companies: { name: string } | null } | null
  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'
  const assessmentDate = new Date(assessment.created_at ?? Date.now())
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const scoresSorted = [...(scores ?? [])].sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )
  const overallScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel: RiskLevel = scoresSorted[0]?.level as RiskLevel ?? 'baixo'
  const criticalCount = scoresSorted.filter(s => s.level === 'critico').length
  const highCount = scoresSorted.filter(s => s.level === 'alto').length

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Diagnóstico NR-1 — ${companyName}`
  pptx.author = 'Sistema de Gestão NR-1'

  // ── Slide 1: Capa ───────────────────────────────────────────────────────────
  const s1 = pptx.addSlide()
  s1.background = { color: '1e3a8a' }

  s1.addText('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS', {
    x: 0.5, y: 1.2, w: 12.5, h: 0.9,
    fontSize: 30, bold: true, color: 'ffffff', align: 'center', fontFace: 'Calibri',
  })
  s1.addText('NR-1 · Portaria MTE nº 1.419/2024 · Guia MTE 2025', {
    x: 0.5, y: 2.1, w: 12.5, h: 0.5,
    fontSize: 15, color: '93c5fd', align: 'center', fontFace: 'Calibri',
  })
  s1.addText('────────────────────────────────', {
    x: 2, y: 2.7, w: 9, h: 0.3, fontSize: 12, color: '3b82f6', align: 'center',
  })
  s1.addText(companyName, {
    x: 0.5, y: 3.1, w: 12.5, h: 0.7,
    fontSize: 26, bold: true, color: 'ffffff', align: 'center', fontFace: 'Calibri',
  })
  s1.addText(`Setor: ${sectorName}`, {
    x: 0.5, y: 3.85, w: 12.5, h: 0.45,
    fontSize: 16, color: 'bfdbfe', align: 'center', fontFace: 'Calibri',
  })
  s1.addText(`Ciclo #${assessment.cycle} · ${assessmentDate}`, {
    x: 0.5, y: 5.7, w: 12.5, h: 0.4,
    fontSize: 12, color: '60a5fa', align: 'center', fontFace: 'Calibri',
  })
  s1.addText(`Modo ${assessment.mode === 'A' ? 'A — Institucional' : 'B — Coleta Anônima'}`, {
    x: 0.5, y: 6.1, w: 12.5, h: 0.35,
    fontSize: 11, color: '93c5fd', align: 'center', fontFace: 'Calibri',
  })

  // ── Slide 2: Resumo Executivo ────────────────────────────────────────────────
  const s2 = pptx.addSlide()

  s2.addText('RESUMO EXECUTIVO', {
    x: 0.5, y: 0.3, w: 12.5, h: 0.6,
    fontSize: 22, bold: true, color: '1e3a8a', fontFace: 'Calibri',
  })

  // Score geral — caixa colorida
  s2.addTable(
    [[{
      text: `${overallScore}\nScore Geral\n${LEVEL_LABELS[worstLevel]}`,
      options: {
        bold: true, color: 'ffffff', align: 'center', valign: 'middle',
        fontSize: 22, fill: { color: LEVEL_COLORS[worstLevel] },
      },
    }]],
    { x: 0.5, y: 1.1, w: 3.2, h: 3, rowH: 3, fontSize: 22 },
  )

  s2.addTable(
    [
      [{ text: 'Indicador', options: { bold: true, fill: { color: 'f1f5f9' }, color: '374151' } },
       { text: 'Resultado', options: { bold: true, fill: { color: 'f1f5f9' }, color: '374151' } }],
      [{ text: 'Fatores críticos' }, { text: `${criticalCount}`, options: { bold: true, color: 'dc2626' } }],
      [{ text: 'Fatores altos' }, { text: `${highCount}`, options: { bold: true, color: 'ea580c' } }],
      [{ text: 'Total de fatores avaliados' }, { text: `${scores?.length ?? 0}` }],
      [{ text: 'Modo de avaliação' }, { text: `Modo ${assessment.mode}` }],
      [{ text: 'Ciclo de avaliação' }, { text: `#${assessment.cycle}` }],
      [{ text: 'Data' }, { text: assessmentDate }],
    ],
    {
      x: 4, y: 1.1, w: 9, colW: [5, 4],
      border: { type: 'solid', color: 'e2e8f0', pt: 1 },
      rowH: 0.48, fontSize: 12, fontFace: 'Calibri',
    },
  )

  s2.addText('Classificação conforme Guia MTE 2025: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100)', {
    x: 0.5, y: 6.5, w: 12.5, h: 0.35,
    fontSize: 9, color: '9ca3af', align: 'center', italic: true,
  })

  // ── Slide 3: Fatores de Risco ────────────────────────────────────────────────
  const s3 = pptx.addSlide()

  s3.addText('FATORES DE RISCO PSICOSSOCIAL', {
    x: 0.5, y: 0.3, w: 12.5, h: 0.6,
    fontSize: 22, bold: true, color: '1e3a8a', fontFace: 'Calibri',
  })

  const factorHeader = [
    { text: '#', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
    { text: 'Fator', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' } } },
    { text: 'Dimensão', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' } } },
    { text: 'Score', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
    { text: 'Nível', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
  ]

  const factorRows = scoresSorted.map(s => {
    const factor = FACTORS.find(f => f.id === s.factor_id)
    const level = s.level as RiskLevel
    const color = LEVEL_COLORS[level]
    return [
      { text: s.factor_id, options: { align: 'center' as const, fontSize: 9, color: '6b7280' } },
      { text: factor?.name ?? s.factor_id, options: { fontSize: 10, color: '111827' } },
      { text: factor?.dimension ?? '—', options: { fontSize: 9, color: '6b7280' } },
      { text: `${s.score.toFixed(0)}/100`, options: { align: 'center' as const, bold: true, color: '111827' } },
      { text: LEVEL_LABELS[level], options: { align: 'center' as const, bold: true, color: 'ffffff', fill: { color } } },
    ]
  })

  s3.addTable([factorHeader, ...factorRows], {
    x: 0.5, y: 1.1, w: 12.5, colW: [0.8, 4.2, 3.5, 1.5, 2.5],
    border: { type: 'solid', color: 'e2e8f0', pt: 1 },
    rowH: 0.38, fontSize: 11, fontFace: 'Calibri',
  })

  // ── Slide 4: Plano de Ação ───────────────────────────────────────────────────
  const actions = (plan?.actions as { description: string; responsible: string; due_date: string | null; type: string; risk_level: string | null }[] | null) ?? []
  const actionsSorted = [...actions].sort(
    (a, b) => (RISK_ORDER[(b.risk_level ?? 'baixo') as RiskLevel] ?? 0) - (RISK_ORDER[(a.risk_level ?? 'baixo') as RiskLevel] ?? 0),
  )

  const s4 = pptx.addSlide()

  s4.addText('PLANO DE AÇÃO', {
    x: 0.5, y: 0.3, w: 12.5, h: 0.6,
    fontSize: 22, bold: true, color: '1e3a8a', fontFace: 'Calibri',
  })

  if (actionsSorted.length === 0) {
    s4.addText('Nenhuma ação registrada no plano.', {
      x: 0.5, y: 3, w: 12.5, h: 1, fontSize: 14, color: '9ca3af', align: 'center',
    })
  } else {
    const actionHeader = [
      { text: 'Ação', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' } } },
      { text: 'Responsável', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' } } },
      { text: 'Prazo', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
      { text: 'Tipo', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
      { text: 'Risco', options: { bold: true, color: 'ffffff', fill: { color: '1e3a8a' }, align: 'center' as const } },
    ]

    const actionRows = actionsSorted.slice(0, 14).map(a => {
      const level = (a.risk_level ?? 'baixo') as RiskLevel
      const color = LEVEL_COLORS[level]
      const dueDate = a.due_date
        ? new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
        : '—'
      return [
        { text: a.description, options: { fontSize: 9, color: '111827' } },
        { text: a.responsible || '—', options: { fontSize: 9, color: '374151' } },
        { text: dueDate, options: { fontSize: 9, align: 'center' as const, color: '374151' } },
        { text: a.type, options: { fontSize: 9, align: 'center' as const, color: '374151' } },
        { text: LEVEL_LABELS[level], options: { fontSize: 9, align: 'center' as const, bold: true, color: 'ffffff', fill: { color } } },
      ]
    })

    s4.addTable([actionHeader, ...actionRows], {
      x: 0.5, y: 1.1, w: 12.5, colW: [4.8, 2.8, 1.6, 1.5, 1.8],
      border: { type: 'solid', color: 'e2e8f0', pt: 1 },
      rowH: 0.42, fontSize: 10, fontFace: 'Calibri',
    })

    if (actionsSorted.length > 14) {
      s4.addText(`+ ${actionsSorted.length - 14} ação(ões) adicionais no plano completo.`, {
        x: 0.5, y: 6.5, w: 12.5, h: 0.35,
        fontSize: 9, color: '9ca3af', italic: true,
      })
    }
  }

  // ── Gerar buffer ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (pptx as any).write('arraybuffer') as ArrayBuffer

  const filename = `diagnostico-nr1-${sectorName}-${new Date().toISOString().split('T')[0]}`
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
