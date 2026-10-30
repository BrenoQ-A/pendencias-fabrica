// Tipos compartilhados do app Pendências da Fábrica

export type StatusPendencia = 'Pendente' | 'Em andamento' | 'Concluído'
export type Prioridade = 'Crítico' | 'Alto' | 'Moderado' | 'Baixo'

export const STATUS: StatusPendencia[] = ['Pendente', 'Em andamento', 'Concluído']
export const PRIORIDADES: Prioridade[] = ['Crítico', 'Alto', 'Moderado', 'Baixo']

export interface FotoItem {
  id: string
  thumbUrl: string
  nome?: string | null
}

export interface HistoricoItem {
  id: string
  status: string
  comentario?: string | null
  autor?: string | null
  criadoEm: string
}

export interface Pendencia {
  id: string
  numero: number
  titulo: string
  detalhe?: string | null
  local: string
  solucao?: string | null
  acao?: string | null
  responsavel: string
  prioridade: string
  status: string
  dataRegistro: string
  dataLimite?: string | null
  resolvidoEm?: string | null
  nota?: string | null
  registradoPor?: string | null
  origem: string
  fotos: FotoItem[]
  historico?: HistoricoItem[]
  createdAt: string
  updatedAt: string
}

export interface NovaFotoPayload {
  dataUrl: string
  thumbUrl: string
  nome?: string
}

export interface PendenciaInput {
  titulo: string
  detalhe?: string
  local: string
  solucao?: string
  acao?: string
  responsavel: string
  prioridade: Prioridade
  dataRegistro?: string
  dataLimite?: string | null
  nota?: string
  registradoPor?: string
  fotos?: NovaFotoPayload[]
}
