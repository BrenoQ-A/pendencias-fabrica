'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ItemFoto {
  id: string
  thumbUrl: string
  nome?: string | null
}

interface Props {
  fotos: ItemFoto[]
  indice: number
  legenda?: string
  aoFechar: () => void
  aoNavegar: (indice: number) => void
}

/** Visualizador de imagem em tela cheia com navegação (o "lightbox"). */
export function Lightbox({ fotos, indice, legenda, aoFechar, aoNavegar }: Props) {
  const foto = fotos[indice]
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async (id: string) => {
    setCarregando(true)
    setDataUrl(null)
    try {
      const res = await fetch(`/api/fotos/${id}`)
      if (res.ok) {
        const json = await res.json()
        setDataUrl(json.dataUrl)
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (foto) carregar(foto.id)
  }, [foto, carregar])

  const prox = useCallback(() => {
    if (fotos.length > 1) aoNavegar((indice + 1) % fotos.length)
  }, [fotos.length, indice, aoNavegar])

  const ant = useCallback(() => {
    if (fotos.length > 1) aoNavegar((indice - 1 + fotos.length) % fotos.length)
  }, [fotos.length, indice, aoNavegar])

  // Teclado: setas navegam, Esc fecha (Dialog já trata Esc)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') prox()
      if (e.key === 'ArrowLeft') ant()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [prox, ant])

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent
        className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none border-none bg-black/95 p-0 sm:rounded-none [&>button]:hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Visualização da foto {indice + 1} de {fotos.length}{legenda ? ` — ${legenda}` : ''}</DialogTitle>

        {/* Topo: contador + fechar */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white tabular-nums">
            {indice + 1} / {fotos.length}
          </span>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Fechar visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Imagem */}
        <div className="flex h-full w-full items-center justify-center px-12 sm:px-16">
          {carregando || !dataUrl ? (
            <Loader2 className="h-10 w-10 animate-spin text-white/70" aria-label="Carregando foto" />
          ) : (
             
            <img
              src={dataUrl}
              alt={foto?.nome ?? legenda ?? 'Foto da pendência'}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {/* Navegação */}
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={ant}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:left-4"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={prox}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:right-4"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Miniaturas navegáveis */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 overflow-x-auto px-4 pb-[env(safe-area-inset-bottom)]">
              {fotos.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => aoNavegar(i)}
                  className={cn(
                    'h-11 w-11 shrink-0 overflow-hidden rounded-md border-2 transition',
                    i === indice ? 'border-orange-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-90',
                  )}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === indice}
                >
                  { }
                  <img src={f.thumbUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
