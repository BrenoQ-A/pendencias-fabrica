'use client'

import { useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  ImageOff,
  Loader2,
  MapPin,
  Pencil,
  ReceiptText,
  StickyNote,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { Lightbox } from '@/components/lightbox'
import { cn } from '@/lib/utils'
import { ESTILO_PRIORIDADE, ESTILO_STATUS, formatarData, isAtrasada, rotuloPrazo } from '@/lib/app-utils'
import type { Pendencia, StatusPendencia } from '@/lib/app-types'

interface Props {
  pendencia: Pendencia | null
  aoFechar: () => void
  aoMudarStatus: (id: string, status: StatusPendencia, comentario?: string) => Promise<void>
  aoEditar: (p: Pendencia) => void
  aoExcluir: (id: string) => Promise<void>
}

const PASSOS: StatusPendencia[] = ['Pendente', 'Em andamento', 'Concluído']

function Linha({ icone: Icone, rotulo, valor }: { icone: React.ElementType; rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="break-words text-sm font-medium">{valor || '—'}</p>
      </div>
    </div>
  )
}

/** Painel de detalhe: fotos + progresso + histórico + ações. */
export function PendenciaDetail({ pendencia: p, aoFechar, aoMudarStatus, aoEditar, aoExcluir }: Props) {
  const { toast } = useToast()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [trocando, setTrocando] = useState<StatusPendencia | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  if (!p) return null
  const atrasada = isAtrasada(p)
  const prazo = rotuloPrazo(p)
  const passoAtual = PASSOS.indexOf(p.status as StatusPendencia)

  async function mudarStatus(novo: StatusPendencia) {
    if (!p || novo === p.status) return
    setTrocando(novo)
    try {
      await aoMudarStatus(p.id, novo, comentario.trim() || undefined)
      setComentario('')
    } finally {
      setTrocando(null)
    }
  }

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg p-0 flex flex-col" aria-describedby={undefined}>
        <SheetHeader className="border-b px-4 py-3 pb-3">
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="min-w-0">
              <SheetTitle className="text-base leading-snug">
                <span className="text-muted-foreground">#{p.numero}</span> {p.titulo}
              </SheetTitle>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', ESTILO_STATUS[p.status])}>
                  {p.status}
                </Badge>
                <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', ESTILO_PRIORIDADE[p.prioridade])}>
                  {p.prioridade}
                </Badge>
                {atrasada && (
                  <Badge
                    variant="outline"
                    className="border-red-300 bg-red-100 px-1.5 py-0 text-[10px] font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  >
                    ⚠ {prazo.texto}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 py-4">
          {/* ===== Galeria de fotos ===== */}
          <section aria-label="Fotos da pendência">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden /> Fotos ({p.fotos.length})
            </h3>
            {p.fotos.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhuma foto registrada. Use &quot;Editar&quot; para adicionar.
              </p>
            ) : (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="list" aria-label="Galeria de fotos">
                {p.fotos.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    role="listitem"
                    onClick={() => setLightbox(i)}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted transition hover:ring-2 hover:ring-orange-500"
                    aria-label={`Ampliar foto ${i + 1} de ${p.fotos.length}`}
                  >
                    { }
                    <img src={f.thumbUrl} alt={`Foto ${i + 1} da pendência ${p.numero}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ===== Progresso ===== */}
          <section aria-label="Progresso da tarefa">
            <h3 className="mb-2 text-sm font-semibold">Progresso</h3>
            <ol className="flex items-center">
              {PASSOS.map((passo, i) => {
                const feito = i <= passoAtual
                return (
                  <li key={passo} className={cn('flex items-center', i < PASSOS.length - 1 && 'flex-1')}>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors',
                          feito
                            ? i === 2
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-orange-500 bg-orange-500 text-white'
                            : 'border-muted-foreground/30 text-muted-foreground/50',
                        )}
                        aria-current={i === passoAtual ? 'step' : undefined}
                      >
                        {i === 2 && feito ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className={cn('text-[10px] font-medium', feito ? 'text-foreground' : 'text-muted-foreground/60')}>
                        {passo}
                      </span>
                    </div>
                    {i < PASSOS.length - 1 && (
                      <div className={cn('mx-1 mb-4 h-0.5 flex-1 rounded', i < passoAtual ? 'bg-orange-500' : 'bg-border')} />
                    )}
                  </li>
                )
              })}
            </ol>
            {p.status === 'Concluído' && p.resolvidoEm && (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                Concluída em {formatarData(p.resolvidoEm)}
              </p>
            )}

            {/* Ações de status */}
            <div className="mt-3 rounded-lg border bg-muted/40 p-3">
              <label htmlFor="comentario-status" className="text-xs font-medium text-muted-foreground">
                Comentário (opcional, fica no histórico)
              </label>
              <Input
                id="comentario-status"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex.: peça encomendada, aguardando chegada…"
                className="mt-1 h-9"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {p.status !== 'Pendente' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={trocando !== null}
                    onClick={() => mudarStatus('Pendente')}
                    className="h-9 min-h-9"
                  >
                    {trocando === 'Pendente' ? <Loader2 className="h-4 w-4 animate-spin" /> : '↩'} Reabrir (Pendente)
                  </Button>
                )}
                {p.status !== 'Em andamento' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={trocando !== null}
                    onClick={() => mudarStatus('Em andamento')}
                    className="h-9 min-h-9 bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {trocando === 'Em andamento' ? <Loader2 className="h-4 w-4 animate-spin" /> : '▶'} Iniciar / Em andamento
                  </Button>
                )}
                {p.status !== 'Concluído' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={trocando !== null}
                    onClick={() => mudarStatus('Concluído')}
                    className="h-9 min-h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {trocando === 'Concluído' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Concluir
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* ===== Dados ===== */}
          <section aria-label="Dados da pendência">
            <h3 className="mb-1 text-sm font-semibold">Dados</h3>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Linha icone={MapPin} rotulo="Local" valor={p.local} />
              <Linha icone={UserRound} rotulo="Responsável" valor={p.responsavel} />
              <Linha icone={CalendarDays} rotulo="Data de registro" valor={formatarData(p.dataRegistro)} />
              <Linha
                icone={CalendarClock}
                rotulo="Data limite"
                valor={p.dataLimite ? `${formatarData(p.dataLimite)}${atrasada ? ' (atrasada)' : ''}` : null}
              />
              <Linha icone={ClipboardList} rotulo="Solução necessária" valor={p.solucao} />
              <Linha icone={Briefcase} rotulo="Ação - Facilities" valor={p.acao} />
              <Linha icone={ReceiptText} rotulo="Nota / OS" valor={p.nota} />
              <Linha icone={FileText} rotulo="Registrado por" valor={p.registradoPor} />
            </div>
            {p.detalhe && (
              <div className="mt-2 rounded-lg bg-muted/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Detalhamento</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{p.detalhe}</p>
              </div>
            )}
          </section>

          {/* ===== Histórico ===== */}
          <section aria-label="Histórico de andamentos">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden /> Histórico
            </h3>
            <ol className="space-y-2.5 border-l-2 border-muted pl-4">
              {(p.historico ?? []).map((h) => (
                <li key={h.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background',
                      h.status === 'Concluído' ? 'bg-emerald-500' : h.status === 'Em andamento' ? 'bg-violet-500' : 'bg-slate-400',
                    )}
                    aria-hidden
                  />
                  <p className="text-sm font-medium">
                    {h.status}
                    {h.autor && <span className="font-normal text-muted-foreground"> · {h.autor}</span>}
                  </p>
                  {h.comentario && (
                    <p className="flex items-start gap-1 text-xs text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {h.comentario}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70">
                    {new Date(h.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Rodapé com ações */}
        <div className="sticky bottom-0 flex gap-2 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => aoEditar(p)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
            onClick={() => setConfirmarExclusao(true)}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      </SheetContent>

      {lightbox !== null && p.fotos.length > 0 && (
        <Lightbox
          fotos={p.fotos}
          indice={lightbox}
          legenda={`Pendência #${p.numero} — ${p.titulo}`}
          aoFechar={() => setLightbox(null)}
          aoNavegar={setLightbox}
        />
      )}

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pendência #{p.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A pendência e suas fotos serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                setConfirmarExclusao(false)
                await aoExcluir(p.id)
                toast({ title: 'Pendência excluída', description: `#${p.numero} removida.` })
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
