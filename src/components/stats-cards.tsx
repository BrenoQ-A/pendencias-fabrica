'use client'

import { AlarmClock, CheckCircle2, ListTodo, Loader, TrendingUp } from 'lucide-react'
import { isAtrasada } from '@/lib/app-utils'
import type { Pendencia } from '@/lib/app-types'
import { cn } from '@/lib/utils'

interface Props {
  itens: Pendencia[]
}

/** Cartões de indicadores derivados da base completa. */
export function StatsCards({ itens }: Props) {
  const total = itens.length
  const atrasadas = itens.filter(isAtrasada).length
  const emAndamento = itens.filter((p) => p.status === 'Em andamento').length
  const pendentes = itens.filter((p) => p.status === 'Pendente').length
  const concluidas = itens.filter((p) => p.status === 'Concluído').length
  const taxa = total ? Math.round((concluidas / total) * 100) : 0

  const cards = [
    {
      rotulo: 'Total',
      valor: total,
      icone: ListTodo,
      cor: 'text-foreground',
      sub: `${pendentes} pendente${pendentes === 1 ? '' : 's'}`,
    },
    {
      rotulo: 'Atrasadas',
      valor: atrasadas,
      icone: AlarmClock,
      cor: atrasadas > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600',
      sub: atrasadas > 0 ? 'prazo vencido' : 'nenhuma em atraso',
    },
    {
      rotulo: 'Em andamento',
      valor: emAndamento,
      icone: Loader,
      cor: 'text-violet-600 dark:text-violet-400',
      sub: 'em execução',
    },
    {
      rotulo: 'Concluídas',
      valor: concluidas,
      icone: CheckCircle2,
      cor: 'text-emerald-600 dark:text-emerald-400',
      sub: `${taxa}% do total`,
    },
  ]

  return (
    <section aria-label="Indicadores das pendências">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {cards.map((c) => (
          <div key={c.rotulo} className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.rotulo}</span>
              <c.icone className={cn('h-4 w-4', c.cor)} aria-hidden />
            </div>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums sm:text-3xl', c.cor)}>{c.valor}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Barra de progresso geral */}
      <div className="mt-2 rounded-xl border bg-card p-3 shadow-sm sm:mt-3 sm:p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Progresso geral de conclusão
          </span>
          <span className="font-semibold tabular-nums">{taxa}%</span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={taxa}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso geral: ${taxa}% concluído`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${taxa}%` }}
          />
        </div>
      </div>
    </section>
  )
}
