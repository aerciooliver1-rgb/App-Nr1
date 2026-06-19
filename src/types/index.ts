export type { Database, UserRole, AssessmentMode, AssessmentStatus, TokenStatus, RiskLevel, ActionStatus, ApprovalStatus, ProgramType, ActionType } from './database'

export const RISK_LEVEL_LABEL: Record<string, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
}

export const RISK_LEVEL_COLOR: Record<string, string> = {
  baixo: 'bg-green-100 text-green-800',
  moderado: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-orange-100 text-orange-800',
  critico: 'bg-red-100 text-red-800',
}

export const RISK_LEVEL_ORDER: Record<string, number> = {
  critico: 4,
  alto: 3,
  moderado: 2,
  baixo: 1,
}

export const ACTION_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
}

export const APPROVAL_STATUS_LABEL: Record<string, string> = {
  aprovado: 'Aprovado',
  com_ressalvas: 'Com Ressalvas',
  em_revisao: 'Em Revisão',
}
