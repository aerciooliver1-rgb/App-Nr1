export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/data/questions'
import type { RiskLevel } from '@/types/database'

// ─── Paleta ───────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<RiskLevel, string> = {
  baixo:    '#16a34a',
  moderado: '#ca8a04',
  alto:     '#ea580c',
  critico:  '#dc2626',
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto', critico: 'Crítico',
}

const RISK_ORDER: Record<RiskLevel, number> = { critico: 4, alto: 3, moderado: 2, baixo: 1 }

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Páginas
  coverPage: {
    backgroundColor: '#0f172a',
    padding: 0,
    fontFamily: 'Helvetica',
  },
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 0,
    paddingBottom: 30,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  // Header padrão de página interna
  pageHeader: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 30,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  pageHeaderTitle: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  pageHeaderCtx: { color: '#93c5fd', fontSize: 8 },
  pageBody: { paddingHorizontal: 30, paddingTop: 18 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: '#9ca3af', fontSize: 7 },
  // Tabelas
  tableHeader: {
    backgroundColor: '#1e3a8a',
    flexDirection: 'row',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tableCell: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 8, color: '#374151' },
  levelBadge: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    paddingVertical: 3,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  // Texto geral
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    marginBottom: 8,
    marginTop: 14,
  },
  bodyText: { fontSize: 9, color: '#374151', lineHeight: 1.5, marginBottom: 6 },
  // Score
  scoreBox: {
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 54, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  scoreLabel: { fontSize: 9, color: '#ffffff', marginTop: 2 },
})

// ─── Componentes ──────────────────────────────────────────────────────────────

function PageFooter({ companyName, sectorName, cycle }: { companyName: string; sectorName: string; cycle: number }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS — NR-1 · {companyName} · {sectorName} · Ciclo #{cycle}</Text>
      <Text style={S.footerText}>Portaria MTE nº 1.419/2024 · Confidencial</Text>
    </View>
  )
}

function InternalPage({ title, context, children, companyName, sectorName, cycle }: {
  title: string; context: string; children: React.ReactNode
  companyName: string; sectorName: string; cycle: number
}) {
  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageHeader}>
        <Text style={S.pageHeaderTitle}>{title}</Text>
        <Text style={S.pageHeaderCtx}>{context}</Text>
      </View>
      <View style={S.pageBody}>{children}</View>
      <PageFooter companyName={companyName} sectorName={sectorName} cycle={cycle} />
    </Page>
  )
}

// ─── Dados do documento ───────────────────────────────────────────────────────

interface DocData {
  companyName: string
  sectorName: string
  cycle: number
  mode: string
  dateLabel: string
  overallScore: number
  worstLevel: RiskLevel
  criticalCount: number
  highCount: number
  scores: { factor_id: string; score: number; level: string }[]
  scoresSorted: { factor_id: string; score: number; level: string }[]
  priorityScores: { factor_id: string; score: number; level: string }[]
  actions: { description: string; responsible: string; due_date: string | null; type: string; risk_level: string | null }[]
  actionsSorted: { description: string; responsible: string; due_date: string | null; type: string; risk_level: string | null }[]
  professionalName: string
  professionalRegistry: string
  managerName: string
}

// ─── Documento PDF ────────────────────────────────────────────────────────────

function DiagnosticoPDF({ d }: { d: DocData }) {
  const ctx = `${d.companyName} · ${d.sectorName} · Ciclo #${d.cycle}`

  return (
    <Document
      title={`Diagnóstico NR-1 — ${d.companyName}`}
      author={d.professionalName}
      subject="Diagnóstico de Riscos Psicossociais — NR-1"
    >
      {/* ── CAPA ─────────────────────────────────────────────────────────── */}
      <Page size="A4" style={S.coverPage}>
        {/* Faixa de cor no topo */}
        <View style={{ height: 6, backgroundColor: LEVEL_COLOR[d.worstLevel] }} />

        {/* Área central */}
        <View style={{ flex: 1, paddingHorizontal: 50, paddingTop: 60, paddingBottom: 40 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 2, marginBottom: 8, fontFamily: 'Helvetica' }}>
            DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS
          </Text>
          <Text style={{ fontSize: 10, color: '#3b82f6', marginBottom: 36, fontFamily: 'Helvetica' }}>
            NR-1 · Portaria MTE nº 1.419/2024 · ISO 45003:2021
          </Text>

          <Text style={{ fontSize: 32, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>
            {d.companyName}
          </Text>
          <View style={{ width: 60, height: 3, backgroundColor: '#3b82f6', marginBottom: 14 }} />
          <Text style={{ fontSize: 14, color: '#93c5fd', marginBottom: 40, fontFamily: 'Helvetica' }}>
            Setor: {d.sectorName}
          </Text>

          {/* Badge de nível */}
          <View style={{
            backgroundColor: LEVEL_COLOR[d.worstLevel],
            paddingVertical: 10,
            paddingHorizontal: 20,
            alignSelf: 'flex-start',
            marginBottom: 40,
          }}>
            <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' }}>
              RISCO {LEVEL_LABEL[d.worstLevel].toUpperCase()}  ·  SCORE {d.overallScore}/100
            </Text>
          </View>

          <Text style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>
            Ciclo #{d.cycle}  ·  Modo {d.mode === 'A' ? 'A — Institucional' : 'B — Coleta Anônima'}
          </Text>
          <Text style={{ fontSize: 9, color: '#475569', marginBottom: 60 }}>
            {d.dateLabel}
          </Text>

          {d.professionalName && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 16 }}>
              <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>Profissional Responsável pela Elaboração</Text>
              <Text style={{ fontSize: 10, color: '#e2e8f0', fontFamily: 'Helvetica-Bold' }}>{d.professionalName}</Text>
              {d.professionalRegistry && (
                <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{d.professionalRegistry}</Text>
              )}
            </View>
          )}
        </View>

        {/* Rodapé da capa */}
        <View style={{ backgroundColor: '#020617', paddingVertical: 10, paddingHorizontal: 50 }}>
          <Text style={{ fontSize: 7, color: '#334155', textAlign: 'center' }}>
            NR-1  ·  Portaria MTE nº 1.419/2024  ·  ISO 45003:2021  ·  Lei 13.709/2018  ·  DOCUMENTO CONFIDENCIAL
          </Text>
        </View>
      </Page>

      {/* ── RESUMO EXECUTIVO ─────────────────────────────────────────────── */}
      <InternalPage title="RESUMO EXECUTIVO" context={ctx}
        companyName={d.companyName} sectorName={d.sectorName} cycle={d.cycle}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
          {/* Score box */}
          <View style={[S.scoreBox, { backgroundColor: LEVEL_COLOR[d.worstLevel], width: 120 }]}>
            <Text style={S.scoreNum}>{d.overallScore}</Text>
            <Text style={S.scoreLabel}>Score Geral</Text>
            <View style={{ width: 60, height: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 6 }} />
            <Text style={{ fontSize: 14, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>
              {LEVEL_LABEL[d.worstLevel].toUpperCase()}
            </Text>
            <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>de 100</Text>
          </View>

          {/* Tabela de indicadores */}
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={S.tableHeader}>
              <Text style={[S.tableHeaderCell, { flex: 3 }]}>INDICADOR</Text>
              <Text style={[S.tableHeaderCell, { flex: 2, textAlign: 'center' }]}>RESULTADO</Text>
            </View>
            {[
              ['Nível de risco geral', LEVEL_LABEL[d.worstLevel]],
              ['Score geral (escala 0–100)', `${d.overallScore}/100`],
              ['Fatores críticos (score > 75)', String(d.criticalCount)],
              ['Fatores altos (score 51–75)', String(d.highCount)],
              ['Total de fatores avaliados', `${d.scores.length} de 13`],
              ['Modo de coleta', `Modo ${d.mode} — ${d.mode === 'A' ? 'Institucional' : 'Anônima'}`],
              ['Ciclo de avaliação', `#${d.cycle}`],
              ['Data de avaliação', d.dateLabel],
            ].map(([label, value], i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, { flex: 3 }]}>{label}</Text>
                <Text style={[S.tableCell, { flex: 2, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ fontSize: 7.5, color: '#9ca3af', fontStyle: 'italic' }}>
          Classificação: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100)
        </Text>
      </InternalPage>

      {/* ── PANORAMA DE RISCO ─────────────────────────────────────────────── */}
      <InternalPage title="PANORAMA DE RISCO PSICOSSOCIAL" context={`${d.sectorName} · ${d.scoresSorted.length} fatores avaliados`}
        companyName={d.companyName} sectorName={d.sectorName} cycle={d.cycle}>
        {/* Tabela de fatores */}
        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, { width: 30 }]}>ID</Text>
          <Text style={[S.tableHeaderCell, { flex: 3 }]}>FATOR DE RISCO</Text>
          <Text style={[S.tableHeaderCell, { flex: 2 }]}>DIMENSÃO</Text>
          <Text style={[S.tableHeaderCell, { width: 42, textAlign: 'center' }]}>SCORE</Text>
          <Text style={[S.tableHeaderCell, { width: 55, textAlign: 'center' }]}>NÍVEL</Text>
        </View>
        {d.scoresSorted.map((s, i) => {
          const factor = FACTORS.find(f => f.id === s.factor_id)
          const level = s.level as RiskLevel
          return (
            <View key={s.factor_id} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={[S.tableCell, { width: 30, color: '#9ca3af' }]}>{s.factor_id}</Text>
              <Text style={[S.tableCell, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{factor?.name ?? s.factor_id}</Text>
              <Text style={[S.tableCell, { flex: 2, color: '#6b7280' }]}>{factor?.dimension ?? '—'}</Text>
              <Text style={[S.tableCell, { width: 42, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{s.score.toFixed(0)}/100</Text>
              <View style={{ width: 55, justifyContent: 'center', alignItems: 'center', paddingVertical: 3 }}>
                <View style={{ backgroundColor: LEVEL_COLOR[level], width: 48, borderRadius: 2 }}>
                  <Text style={S.levelBadge}>{LEVEL_LABEL[level]}</Text>
                </View>
              </View>
            </View>
          )
        })}
        <Text style={{ fontSize: 7.5, color: '#9ca3af', fontStyle: 'italic', marginTop: 8 }}>
          Escala de classificação: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100)
        </Text>
      </InternalPage>

      {/* ── FATORES PRIORITÁRIOS (condicional) ────────────────────────────── */}
      {d.priorityScores.length > 0 && (
        <InternalPage
          title="FATORES PRIORITÁRIOS"
          context={`${d.criticalCount} crítico${d.criticalCount !== 1 ? 's' : ''} · ${d.highCount} alto${d.highCount !== 1 ? 's' : ''}`}
          companyName={d.companyName} sectorName={d.sectorName} cycle={d.cycle}
        >
          <View style={{ backgroundColor: '#fff7ed', borderLeftWidth: 3, borderLeftColor: '#ea580c', padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: '#9a3412', fontFamily: 'Helvetica-Bold' }}>Atenção</Text>
            <Text style={{ fontSize: 8.5, color: '#9a3412', marginTop: 3 }}>
              Os fatores abaixo apresentam nível crítico ou alto e requerem ação prioritária. Consulte o Plano de Ação para as intervenções indicadas.
            </Text>
          </View>

          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, { width: 30 }]}>ID</Text>
            <Text style={[S.tableHeaderCell, { flex: 3 }]}>FATOR DE RISCO</Text>
            <Text style={[S.tableHeaderCell, { flex: 2 }]}>DIMENSÃO</Text>
            <Text style={[S.tableHeaderCell, { width: 42, textAlign: 'center' }]}>SCORE</Text>
            <Text style={[S.tableHeaderCell, { width: 55, textAlign: 'center' }]}>NÍVEL</Text>
          </View>
          {d.priorityScores.map((s, i) => {
            const factor = FACTORS.find(f => f.id === s.factor_id)
            const level = s.level as RiskLevel
            return (
              <View key={s.factor_id} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, { width: 30, color: '#9ca3af' }]}>{s.factor_id}</Text>
                <Text style={[S.tableCell, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{factor?.name ?? s.factor_id}</Text>
                <Text style={[S.tableCell, { flex: 2, color: '#6b7280' }]}>{factor?.dimension ?? '—'}</Text>
                <Text style={[S.tableCell, { width: 42, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{s.score.toFixed(0)}/100</Text>
                <View style={{ width: 55, justifyContent: 'center', alignItems: 'center', paddingVertical: 3 }}>
                  <View style={{ backgroundColor: LEVEL_COLOR[level], width: 48, borderRadius: 2 }}>
                    <Text style={S.levelBadge}>{LEVEL_LABEL[level]}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </InternalPage>
      )}

      {/* ── PLANO DE AÇÃO ──────────────────────────────────────────────────── */}
      <InternalPage title="PLANO DE AÇÃO" context={`${d.actionsSorted.length} ação${d.actionsSorted.length !== 1 ? 'ões' : ''}`}
        companyName={d.companyName} sectorName={d.sectorName} cycle={d.cycle}>
        {d.actionsSorted.length === 0 ? (
          <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 20, textAlign: 'center' }}>
            Nenhuma ação registrada no plano.
          </Text>
        ) : (
          <>
            <View style={S.tableHeader}>
              <Text style={[S.tableHeaderCell, { flex: 4 }]}>AÇÃO</Text>
              <Text style={[S.tableHeaderCell, { flex: 2 }]}>RESPONSÁVEL</Text>
              <Text style={[S.tableHeaderCell, { width: 55, textAlign: 'center' }]}>PRAZO</Text>
              <Text style={[S.tableHeaderCell, { width: 55, textAlign: 'center' }]}>TIPO</Text>
              <Text style={[S.tableHeaderCell, { width: 55, textAlign: 'center' }]}>RISCO</Text>
            </View>
            {d.actionsSorted.map((a, i) => {
              const level = (a.risk_level ?? 'baixo') as RiskLevel
              const due = a.due_date
                ? new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
                : '—'
              return (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={[S.tableCell, { flex: 4 }]}>{a.description}</Text>
                  <Text style={[S.tableCell, { flex: 2, color: '#6b7280' }]}>{a.responsible || '—'}</Text>
                  <Text style={[S.tableCell, { width: 55, textAlign: 'center', color: '#6b7280' }]}>{due}</Text>
                  <Text style={[S.tableCell, { width: 55, textAlign: 'center', color: '#6b7280' }]}>
                    {a.type === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                  </Text>
                  <View style={{ width: 55, justifyContent: 'center', alignItems: 'center', paddingVertical: 3 }}>
                    <View style={{ backgroundColor: LEVEL_COLOR[level], width: 48, borderRadius: 2 }}>
                      <Text style={S.levelBadge}>{LEVEL_LABEL[level]}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </>
        )}
      </InternalPage>

      {/* ── METODOLOGIA ────────────────────────────────────────────────────── */}
      <InternalPage title="METODOLOGIA" context="NR-1 · Guia MTE 2025"
        companyName={d.companyName} sectorName={d.sectorName} cycle={d.cycle}>
        {([
          ['Base Legal',
            'NR-1 (Portaria MTE nº 1.419/2024) e Guia Prático do MTE 2025, alinhado à ISO 45003:2021. A norma estabelece diretrizes para identificação, avaliação e controle de riscos psicossociais no ambiente de trabalho.'],
          ['Instrumento de Avaliação',
            'Escala validada composta por 50 questões em formato Likert de 5 pontos (0 = Nunca / 4 = Sempre), agrupadas em 13 fatores de risco psicossocial conforme as dimensões do Guia MTE 2025.'],
          ['Fatores Avaliados',
            '13 fatores organizados em dimensões: organização do trabalho, relações interpessoais, papel e clareza, liderança, carga e ritmo de trabalho, autonomia, segurança e futuro profissional.'],
          ['Modo de Coleta',
            d.mode === 'A'
              ? 'Modo A — Aplicação institucional: questionário aplicado de forma presencial ou remota, com identificação do respondente. Permite análise individualizada.'
              : 'Modo B — Coleta anônima: respostas coletadas via link seguro sem identificação do respondente, em conformidade com a LGPD (Lei 13.709/2018).'],
          ['Cálculo de Score',
            'Scores normalizados para a escala 0–100. Valores mais altos indicam maior intensidade do fator de risco. Classificação: Baixo (0–25) · Moderado (26–50) · Alto (51–75) · Crítico (76–100).'],
          ['Plano de Ação',
            'Intervenções selecionadas do catálogo de programas NR-1 e convertidas em ações com responsável, prazo e tipo (preventiva/corretiva), priorizadas pela criticidade do fator associado.'],
        ] as [string, string][]).map(([title, body], i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ width: 3, backgroundColor: '#3b82f6', marginTop: 1, height: 54 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 3 }}>{title}</Text>
                <Text style={S.bodyText}>{body}</Text>
              </View>
            </View>
          </View>
        ))}
      </InternalPage>

      {/* ── ASSINATURAS ────────────────────────────────────────────────────── */}
      <Page size="A4" style={S.coverPage}>
        <View style={{ height: 6, backgroundColor: LEVEL_COLOR[d.worstLevel] }} />

        <View style={{ flex: 1, paddingHorizontal: 50, paddingTop: 50, paddingBottom: 40 }}>
          <Text style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 1.5, marginBottom: 6 }}>
            DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS
          </Text>
          <Text style={{ fontSize: 20, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
            {d.companyName}
          </Text>
          <Text style={{ fontSize: 11, color: '#93c5fd', marginBottom: 40 }}>
            Setor: {d.sectorName}  ·  Ciclo #{d.cycle}  ·  {d.dateLabel}
          </Text>

          <Text style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, marginBottom: 24, fontFamily: 'Helvetica-Bold' }}>
            ASSINATURAS
          </Text>

          {/* Dois blocos de assinatura lado a lado */}
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 30 }}>
            {/* Profissional Responsável */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#1e3a8a', padding: 20 }}>
              <Text style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'Helvetica-Bold', marginBottom: 14, letterSpacing: 0.5 }}>
                RESPONSÁVEL PELA ELABORAÇÃO
              </Text>

              {/* Campo de assinatura */}
              <View style={{ height: 48, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 12 }} />

              <Text style={{ fontSize: 9, color: '#e2e8f0', fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
                {d.professionalName || '_________________________________'}
              </Text>
              {d.professionalRegistry ? (
                <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 3 }}>{d.professionalRegistry}</Text>
              ) : null}
              <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 14 }}>Profissional de Saúde Ocupacional</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 7.5, color: '#64748b' }}>Data:</Text>
                <View style={{ flex: 1, height: 1, borderBottomWidth: 1, borderBottomColor: '#334155' }} />
              </View>
            </View>

            {/* Gestor / Responsável pela empresa */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#1e3a8a', padding: 20 }}>
              <Text style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'Helvetica-Bold', marginBottom: 14, letterSpacing: 0.5 }}>
                RESPONSÁVEL PELA EMPRESA
              </Text>

              {/* Campo de assinatura */}
              <View style={{ height: 48, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 12 }} />

              <Text style={{ fontSize: 9, color: '#e2e8f0', fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
                {d.managerName || '_________________________________'}
              </Text>
              <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 14 }}>Gestor / Representante Legal</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 7.5, color: '#64748b' }}>Data:</Text>
                <View style={{ flex: 1, height: 1, borderBottomWidth: 1, borderBottomColor: '#334155' }} />
              </View>
            </View>
          </View>

          {/* Nota Gov.br */}
          <View style={{ borderWidth: 1, borderColor: '#1e3a8a', padding: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>
              ASSINATURA DIGITAL VIA GOV.BR
            </Text>
            <Text style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.5 }}>
              Este documento está habilitado para assinatura digital qualificada conforme o Decreto nº 8.771/2016 e a
              Lei nº 14.063/2020. Para assinar digitalmente via plataforma Gov.br:
            </Text>
            <Text style={{ fontSize: 8, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
              1. Acesse assinatura.iti.br{'\n'}
              2. Faça login com seu CPF e senha Gov.br{'\n'}
              3. Faça o upload deste documento PDF{'\n'}
              4. Assine digitalmente e baixe a versão certificada
            </Text>
          </View>

          <Text style={{ fontSize: 7.5, color: '#475569', textAlign: 'center' }}>
            Documento gerado em conformidade com a NR-1 · Portaria MTE nº 1.419/2024 · LGPD (Lei 13.709/2018)
          </Text>
        </View>

        <View style={{ backgroundColor: '#020617', paddingVertical: 10, paddingHorizontal: 50 }}>
          <Text style={{ fontSize: 7, color: '#334155', textAlign: 'center' }}>
            NR-1  ·  Portaria MTE nº 1.419/2024  ·  ISO 45003:2021  ·  Lei 13.709/2018  ·  DOCUMENTO CONFIDENCIAL
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autorizado', { status: 401 })

  const assessmentId = request.nextUrl.searchParams.get('assessmentId')
  if (!assessmentId) return new Response('assessmentId ausente', { status: 400 })

  const [
    { data: assessment },
    { data: scores },
    { data: plan },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, mode, cycle, created_at, sectors(name, companies(name, contact_name))')
      .eq('id', assessmentId)
      .single(),
    supabase.from('risk_scores').select('factor_id, score, level').eq('assessment_id', assessmentId),
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

  const sector = assessment.sectors as {
    name: string
    companies: { name: string; contact_name: string | null } | null
  } | null

  const companyName = sector?.companies?.name ?? 'Empresa'
  const sectorName = sector?.name ?? 'Setor'
  const managerName = sector?.companies?.contact_name ?? ''
  const dateLabel = new Date(assessment.created_at ?? Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const scoresSorted = [...(scores ?? [])].sort(
    (a, b) => (RISK_ORDER[b.level as RiskLevel] ?? 0) - (RISK_ORDER[a.level as RiskLevel] ?? 0),
  )
  const overallScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0
  const worstLevel: RiskLevel = (scoresSorted[0]?.level ?? 'baixo') as RiskLevel
  const criticalCount = scoresSorted.filter(s => s.level === 'critico').length
  const highCount = scoresSorted.filter(s => s.level === 'alto').length
  const priorityScores = scoresSorted.filter(s => s.level === 'critico' || s.level === 'alto')

  const actions = (plan?.actions as {
    description: string; responsible: string; due_date: string | null; type: string; risk_level: string | null
  }[] | null) ?? []
  const actionsSorted = [...actions].sort(
    (a, b) =>
      (RISK_ORDER[(b.risk_level ?? 'baixo') as RiskLevel] ?? 0) -
      (RISK_ORDER[(a.risk_level ?? 'baixo') as RiskLevel] ?? 0),
  )

  const docData: DocData = {
    companyName,
    sectorName,
    cycle: assessment.cycle,
    mode: assessment.mode,
    dateLabel,
    overallScore,
    worstLevel,
    criticalCount,
    highCount,
    scores: scores ?? [],
    scoresSorted,
    priorityScores,
    actions,
    actionsSorted,
    professionalName: profile?.full_name ?? (user.user_metadata?.name as string | undefined) ?? '',
    professionalRegistry: profile?.registro_profissional ?? '',
    managerName,
  }

  const pdfBuffer = await renderToBuffer(<DiagnosticoPDF d={docData} />)

  const filename = `relatorio-nr1-${sectorName}-ciclo${assessment.cycle}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .concat('.pdf')

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
