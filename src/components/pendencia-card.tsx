'use client'

import { ImageOff, Images, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ESTILO_PRIORIDADE, ESTILO_STATUS, isAtrasada, rotuloPrazo } from '@/lib/app-utils'
import type { Pendencia } from '@/lib/app-types'

interface Props {
  p: Pendencia
  aoAbrir?: (p: Pendencia) => void
  className?: string
}

/** Card compacto de pendência — usado na lista e no kanban. */
export function PendenciaCard({ p, aoAbrir, className }: Props) {
  const atrasada = isAtrasada(p)
  const prazo = rotuloPrazo(p)
  const thumb = p.fotos[0]?.thumbUrl

  return (
    <button
      type="button"
      onClick={() => aoAbrir?.(p)}
      aria-label={`Abrir pendência nº ${p.numero}: ${p.titulo}`}
      className={cn(
        'group w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-all',
        'hover:shadow-md hover:border-orange-400/60 focus-visible:ring-2 focus-visible:ring-orange-500',
        'active:scale-[0.995] flex gap-3 items-start min-h-[72px]',
        atrasada && 'border-red-300 dark:border-red-900',
        className,
      )}
    >
      {/* Miniatura da foto */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumb ? (
           
          <img src={thumb} alt={`Foto da pendência ${p.numero}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-5 w-5" aria-hidden />
          </div>
        )}
        {p.fotos.length > 1 && (
          <span className="absolute bottom-0 right-0 flex items-center gap-0.5 rounded-tl-md bg-black/65 px-1 py-0.5 text-[10px] font-medium text-white">
            <Images className="h-3 w-3" aria-hidden />
            {p.fotos.length}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.titulo}</p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">#{p.numero}</span>
        </div>

        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {p.local}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px] font-medium', ESTILO_STATUS[p.status])}>
            {p.status}
          </Badge>
          <Badge
            variant="outline"
            className={cn('px-1.5 py-0 text-[10px] font-medium', ESTILO_PRIORIDADE[p.prioridade])}
          >
            {p.prioridade}
          </Badge>
          {prazo.atrasada && (
            <Badge
              variant="outline"
              className="border-red-300 bg-red-100 px-1.5 py-0 text-[10px] font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              ⚠ {prazo.texto}
            </Badge>
          )}
          {!prazo.atrasada && p.dataLimite && p.status !== 'Concluído' && (
            <span className="text-[11px] text-muted-foreground">{prazo.texto}</span>
          )}
        </div>
      </div>
    </button>
  )
}
