'use client'

import { CheckCircle2, PlayCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PendenciaCard } from '@/components/pendencia-card'
import { isAtrasada } from '@/lib/app-utils'
import type { Pendencia, StatusPendencia } from '@/lib/app-types'
import { cn } from '@/lib/utils'

interface Props {
  itens: Pendencia[]
  aoAbrir: (p: Pendencia) => void
  aoMudarStatus: (id: string, status: StatusPendencia) => Promise<void>
  trocandoId: string | null
  /** false para SUPERVISOR: esconde as ações rápidas de status */
  podeEditar: boolean
}

const COLUNAS: { status: StatusPendencia; titulo: string; anel: string; ponto: string }[] = [
  { status: 'Pendente', titulo: 'Pendente', anel: 'border-t-slate-400', ponto: 'bg-slate-400' },
  { status: 'Em andamento', titulo: 'Em andamento', anel: 'border-t-violet-500', ponto: 'bg-violet-500' },
  { status: 'Concluído', titulo: 'Concluído', anel: 'border-t-emerald-500', ponto: 'bg-emerald-500' },
]

/** Quadro de progresso com 3 colunas e ações rápidas em cada card. */
export function KanbanBoard({ itens, aoAbrir, aoMudarStatus, trocandoId, podeEditar }: Props) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0" role="list" aria-label="Quadro de progresso">
      {COLUNAS.map((col) => {
        const daColuna = itens
          .filter((p) => p.status === col.status)
          .sort((a, b) => (a.dataLimite ?? '9999').localeCompare(b.dataLimite ?? '9999'))
        const nAtrasadas = daColuna.filter(isAtrasada).length
        return (
          <section
            key={col.status}
            role="listitem"
            aria-label={`${col.titulo}: ${daColuna.length} pendências`}
            className={cn(
              'w-[86vw] max-w-[340px] shrink-0 snap-center rounded-xl border border-t-4 bg-muted/30 sm:w-auto sm:max-w-none sm:shrink',
              col.anel,
            )}
          >
            <header className="flex items-center justify-between gap-2 px-3 py-2.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn('h-2 w-2 rounded-full', col.ponto)} aria-hidden />
                {col.titulo}
              </h3>
              <span className="flex items-center gap-1.5">
                {nAtrasadas > 0 && col.status !== 'Concluído' && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                    ⚠ {nAtrasadas} atrasada{nAtrasadas > 1 ? 's' : ''}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">{daColuna.length}</span>
              </span>
            </header>

            <div className="max-h-[62vh] space-y-2 overflow-y-auto px-2 pb-3">
              {daColuna.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nada aqui por enquanto 🎉
                </p>
              ) : (
                daColuna.map((p) => (
                  <div key={p.id} className="relative">
                    <PendenciaCard p={p} aoAbrir={aoAbrir} />
                    {podeEditar && (
                      <div className="mt-1 flex gap-1.5 px-0.5">
                        {p.status !== 'Pendente' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={trocandoId === p.id}
                            onClick={() => aoMudarStatus(p.id, 'Pendente')}
                            className="h-8 flex-1 gap-1 text-[11px] text-muted-foreground"
                            aria-label={`Reabrir pendência #${p.numero} como pendente`}
                          >
                            <RotateCcw className="h-3 w-3" /> Reabrir
                          </Button>
                        )}
                        {p.status === 'Pendente' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={trocandoId === p.id}
                            onClick={() => aoMudarStatus(p.id, 'Em andamento')}
                            className="h-8 flex-1 gap-1 text-[11px] text-violet-700 dark:text-violet-400"
                            aria-label={`Iniciar pendência #${p.numero}`}
                          >
                            <PlayCircle className="h-3 w-3" /> Iniciar
                          </Button>
                        )}
                        {p.status !== 'Concluído' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={trocandoId === p.id}
                            onClick={() => aoMudarStatus(p.id, 'Concluído')}
                            className="h-8 flex-1 gap-1 text-[11px] text-emerald-700 dark:text-emerald-400"
                            aria-label={`Concluir pendência #${p.numero}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Concluir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
