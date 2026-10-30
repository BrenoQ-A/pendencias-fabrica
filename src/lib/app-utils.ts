// Utilidades do app: status, prioridades, datas (seguras p/ fuso), CSV
import type { Pendencia, Prioridade, StatusPendencia } from './app-types'

export const STATUS_LISTA: StatusPendencia[] = ['Pendente', 'Em andamento', 'Concluído']
export const PRIORIDADES_LISTA: Prioridade[] = ['Crítico', 'Alto', 'Moderado', 'Baixo']

/** Data de hoje no fuso local no formato YYYY-MM-DD */
export function hojeISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

/** YYYY-MM-DD (parte da data de um ISO qualquer) */
export function dataISO(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/** Exibe dd/mm/aaaa a partir de ISO — manipulação de string, imune a fuso */
export function formatarData(iso: string | null | undefined): string {
  const s = dataISO(iso)
  if (!s) return '—'
  const [a, m, d] = s.split('-')
  return `${d}/${m}/${a}`
}

export function isAtrasada(p: Pick<Pendencia, 'dataLimite' | 'status'>): boolean {
  if (!p.dataLimite || p.status === 'Concluído') return false
  const limite = dataISO(p.dataLimite)
  return limite < hojeISO()
}

export function diasAtraso(p: Pick<Pendencia, 'dataLimite' | 'status'>): number {
  if (!isAtrasada(p)) return 0
  const limite = new Date(`${dataISO(p.dataLimite)}T12:00:00`)
  const hoje = new Date(`${hojeISO()}T12:00:00`)
  return Math.round((hoje.getTime() - limite.getTime()) / 86400000)
}

/** Dias até o prazo: positivo = dias restantes; 0 = vence hoje; negativo = dias em atraso */
export function diasParaVencer(p: Pick<Pendencia, 'dataLimite' | 'status'>): number | null {
  if (!p.dataLimite || p.status === 'Concluído') return null
  const limite = new Date(`${dataISO(p.dataLimite)}T12:00:00`)
  const hoje = new Date(`${hojeISO()}T12:00:00`)
  return Math.round((limite.getTime() - hoje.getTime()) / 86400000)
}

export const ESTILO_STATUS: Record<string, string> = {
  Pendente: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  'Em andamento':
    'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  Concluído:
    'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
}

export const ESTILO_PRIORIDADE: Record<string, string> = {
  Crítico: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  Alto: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  Moderado:
    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  Baixo: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600',
}

export function exportarCSV(lista: Pendencia[], atrasadasFn: (p: Pendencia) => boolean) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = [
    'Nº',
    'Problema',
    'Local',
    'Prioridade',
    'Status',
    'Atrasada',
    'Data registro',
    'Data limite',
    'Responsável',
    'Solução',
    'Ação',
    'Detalhamento',
    'Nota/OS',
    'Registrado por',
    'Origem',
    'Fotos',
  ]
  const linhas = lista.map((p) =>
    [
      p.numero,
      p.titulo,
      p.local,
      p.prioridade,
      p.status,
      atrasadasFn(p) ? 'Sim' : 'Não',
      formatarData(p.dataRegistro),
      p.dataLimite ? formatarData(p.dataLimite) : '',
      p.responsavel,
      p.solucao ?? '',
      p.acao ?? '',
      p.detalhe ?? '',
      p.nota ?? '',
      p.registradoPor ?? '',
      p.origem,
      p.fotos.length,
    ]
      .map(esc)
      .join(';'),
  )
  const csv = '\uFEFF' + [head.map(esc).join(';'), ...linhas].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pendencias-fabrica-${hojeISO()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Rótulo amigável do prazo */
export function rotuloPrazo(p: Pick<Pendencia, 'dataLimite' | 'status'>): { texto: string; atrasada: boolean } {
  const atrasada = isAtrasada(p)
  if (!p.dataLimite) return { texto: 'Sem prazo', atrasada: false }
  const d = diasParaVencer(p)
  if (p.status === 'Concluído') return { texto: `Prazo: ${formatarData(p.dataLimite)}`, atrasada: false }
  if (d === 0) return { texto: 'Vence hoje', atrasada: false }
  if (d !== null && d < 0) return { texto: `Atrasada há ${Math.abs(d!)} dia${Math.abs(d!) > 1 ? 's' : ''}`, atrasada: true }
  if (d === 1) return { texto: 'Vence amanhã', atrasada: false }
  return { texto: `Vence em ${d} dias · ${formatarData(p.dataLimite)}`, atrasada: false }
}
