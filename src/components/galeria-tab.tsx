'use client'

import { ImageOff } from 'lucide-react'
import { isAtrasada } from '@/lib/app-utils'
import type { Pendencia } from '@/lib/app-types'
import { cn } from '@/lib/utils'

interface Props {
  itens: Pendencia[]
  /** Abre o lightbox com a lista "achatada" de fotos de todos os cards filtrados */
  aoAbrirFotos: (fotos: { id: string; thumbUrl: string; nome?: string | null }[], indice: number, legenda: string) => void
}

interface FotoComContexto {
  id: string
  thumbUrl: string
  nome?: string | null
  pendencia: Pendencia
}

/** Galeria de todas as fotos das pendências filtradas — visualização rápida de imagens. */
export function GaleriaTab({ itens, aoAbrirFotos }: Props) {
  const fotos: FotoComContexto[] = itens.flatMap((p) =>
    p.fotos.map((f) => ({ id: f.id, thumbUrl: f.thumbUrl, nome: f.nome, pendencia: p })),
  )

  if (fotos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Nenhuma foto nas pendências filtradas.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" role="list" aria-label="Galeria de fotos das pendências">
      {fotos.map((f, i) => {
        const atrasada = isAtrasada(f.pendencia)
        return (
          <button
            key={f.id}
            type="button"
            role="listitem"
            onClick={() =>
              aoAbrirFotos(
                fotos.map((x) => ({ id: x.id, thumbUrl: x.thumbUrl, nome: x.nome })),
                i,
                `#${f.pendencia.numero} — ${f.pendencia.titulo}`,
              )
            }
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted transition hover:ring-2 hover:ring-orange-500"
            aria-label={`Ver foto de #${f.pendencia.numero}: ${f.pendencia.titulo}`}
          >
            { }
            <img
              src={f.thumbUrl}
              alt={`Foto da pendência #${f.pendencia.numero} — ${f.pendencia.titulo}`}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 text-left text-[10px] font-medium leading-tight text-white">
              #{f.pendencia.numero} {f.pendencia.titulo}
            </span>
            {atrasada && (
              <span
                className={cn(
                  'absolute left-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white',
                )}
              >
                ATRASADA
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
