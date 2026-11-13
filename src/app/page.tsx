'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, LayoutGrid, List, LogOut, Plus, RefreshCcw, SquareStack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { FiltersBar, FILTROS_INICIAIS, filtrar, type Filtros } from '@/components/filters-bar'
import { GaleriaTab } from '@/components/galeria-tab'
import { KanbanBoard } from '@/components/kanban'
import { Lightbox } from '@/components/lightbox'
import { PendenciaCard } from '@/components/pendencia-card'
import { PendenciaDetail } from '@/components/pendencia-detail'
import { PendenciaForm } from '@/components/pendencia-form'
import { StatsCards } from '@/components/stats-cards'
import { ThemeToggle } from '@/components/theme-toggle'
import { exportarCSV, isAtrasada } from '@/lib/app-utils'
import type { Pendencia, PendenciaInput, StatusPendencia } from '@/lib/app-types'
import { cn } from '@/lib/utils'

type Aba = 'lista' | 'kanban' | 'fotos'

export default function Pagina() {
  const { toast } = useToast()
  const [itens, setItens] = useState<Pendencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('lista')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [detail, setDetail] = useState<Pendencia | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Pendencia | null>(null)
  const [trocandoId, setTrocandoId] = useState<string | null>(null)
  const [lightboxGaleria, setLightboxGaleria] = useState<{ fotos: { id: string; thumbUrl: string; nome?: string | null }[]; indice: number; legenda: string } | null>(null)
  const [usuarioLogado, setUsuarioLogado] = useState<string | null>(null)
  const [podeEditar, setPodeEditar] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/pendencias')
      if (res.status === 401) {
        // sessão expirada: volta para o login
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error('falha')
      setItens(await res.json())
    } catch {
      toast({ title: 'Erro ao carregar', description: 'Não foi possível carregar as pendências.', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        setUsuarioLogado(s?.nome ?? s?.usuario ?? null)
        setPodeEditar(s?.papel === 'ADMIN')
      })
      .catch(() => {})
  }, [carregar])

  const sair = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // mesmo sem resposta, segue para o login
    }
    window.location.href = '/login'
  }, [])

  const locaisExistentes = useMemo(() => [...new Set(itens.map((p) => p.local))], [itens])
  const responsaveisExistentes = useMemo(() => [...new Set(itens.map((p) => p.responsavel))], [itens])
  const filtrados = useMemo(() => filtrar(itens, filtros, isAtrasada), [itens, filtros])

  // ===== Ações =====
  const mudarStatus = useCallback(
    async (id: string, status: StatusPendencia, comentario?: string) => {
      setTrocandoId(id)
      try {
        const res = await fetch(`/api/pendencias/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, comentario, autor: 'App' }),
        })
        if (!res.ok) throw new Error()
        const atualizada: Pendencia = await res.json()
        setItens((atual) => atual.map((p) => (p.id === id ? atualizada : p)))
        setDetail((d) => (d && d.id === id ? atualizada : d))
        toast({
          title: status === 'Concluído' ? '✅ Pendência concluída' : 'Status atualizado',
          description: `Agora está "${status}".${comentario ? ` Comentário registrado.` : ''}`,
        })
      } catch {
        toast({ title: 'Erro ao alterar status', variant: 'destructive' })
      } finally {
        setTrocandoId(null)
      }
    },
    [toast],
  )

  const salvar = useCallback(
    async (dados: PendenciaInput, manterFotoIds: string[]) => {
      try {
        if (editando) {
          const res = await fetch(`/api/pendencias/${editando.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...dados, manterFotoIds }),
          })
          if (!res.ok) throw new Error()
          const atualizada: Pendencia = await res.json()
          setItens((atual) => atual.map((p) => (p.id === atualizada.id ? atualizada : p)))
          setDetail((d) => (d && d.id === atualizada.id ? atualizada : d))
          toast({ title: 'Alterações salvas', description: `Pendência #${atualizada.numero} atualizada.` })
        } else {
          const res = await fetch('/api/pendencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
          })
          if (!res.ok) throw new Error()
          const criada: Pendencia = await res.json()
          setItens((atual) => [criada, ...atual])
          toast({ title: '✅ Pendência registrada', description: `#${criada.numero} — ${criada.titulo}` })
        }
      } catch {
        toast({ title: 'Erro ao salvar', description: 'Verifique os dados e tente novamente.', variant: 'destructive' })
        throw new Error('falha ao salvar')
      }
    },
    [editando, toast],
  )

  const excluir = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/pendencias/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
        setItens((atual) => atual.filter((p) => p.id !== id))
        setDetail(null)
      } catch {
        toast({ title: 'Erro ao excluir', variant: 'destructive' })
      }
    },
    [toast],
  )

  const abrirEdicao = useCallback((p: Pendencia) => {
    setDetail(null)
    setEditando(p)
    setFormAberto(true)
  }, [])

  const abas: { id: Aba; rotulo: string; icone: React.ElementType }[] = [
    { id: 'lista', rotulo: 'Lista', icone: List },
    { id: 'kanban', rotulo: 'Progresso', icone: LayoutGrid },
    { id: 'fotos', rotulo: 'Fotos', icone: SquareStack },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      {/* ===== Cabeçalho ===== */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-lg font-black text-white" aria-hidden>
            P
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">Pendências — Instalações da Fábrica</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Registro e acompanhamento de problemas · MVP</p>
          </div>
          <ThemeToggle />
          {usuarioLogado && (
            <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground lg:inline">
              {usuarioLogado}
              {!podeEditar && ' · só leitura'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={sair}
            aria-label="Sair do app"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sair</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={() => exportarCSV(itens, isAtrasada)}
            aria-label="Exportar dados em CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Exportar CSV</span>
          </Button>
          {podeEditar && (
            <Button
              size="sm"
              className="hidden h-9 shrink-0 gap-1.5 bg-orange-600 text-white hover:bg-orange-700 sm:flex"
              onClick={() => {
                setEditando(null)
                setFormAberto(true)
              }}
            >
              <Plus className="h-4 w-4" /> Nova pendência
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 sm:pb-8">
        <div className="space-y-3 sm:space-y-4">
          {carregando ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-14 rounded-xl" />
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <StatsCards itens={itens} />

              <FiltersBar itens={itens} filtros={filtros} aoMudar={setFiltros} />

              {/* Abas */}
              <div role="tablist" aria-label="Modos de visualização" className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
                {abas.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={aba === t.id}
                    onClick={() => setAba(t.id)}
                    className={cn(
                      'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
                      aba === t.id ? 'bg-orange-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <t.icone className="h-4 w-4" aria-hidden />
                    {t.rotulo}
                    {t.id === 'fotos' && (
                      <span className={cn('rounded-full px-1.5 text-[10px] font-bold', aba === 'fotos' ? 'bg-white/25' : 'bg-muted')}>
                        {filtrados.reduce((n, p) => n + p.fotos.length, 0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Conteúdo da aba */}
              {aba === 'lista' && (
                <section aria-label="Lista de pendências" className="grid gap-2 md:grid-cols-2">
                  {filtrados.length === 0 ? (
                    <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhuma pendência encontrada com os filtros atuais.
                    </p>
                  ) : (
                    filtrados.map((p) => <PendenciaCard key={p.id} p={p} aoAbrir={setDetail} />)
                  )}
                </section>
              )}

              {aba === 'kanban' && (
                <KanbanBoard
                  itens={filtrados}
                  aoAbrir={setDetail}
                  aoMudarStatus={mudarStatus}
                  trocandoId={trocandoId}
                  podeEditar={podeEditar}
                />
              )}

              {aba === 'fotos' && (
                <GaleriaTab
                  itens={filtrados}
                  aoAbrirFotos={(fotos, indice, legenda) => setLightboxGaleria({ fotos, indice, legenda })}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ===== FAB (celular) ===== */}
      {podeEditar && (
        <button
          type="button"
          onClick={() => {
            setEditando(null)
            setFormAberto(true)
          }}
          className="fixed bottom-5 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-orange-600 px-5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700 active:scale-95 sm:hidden"
          aria-label="Nova pendência"
        >
          <Plus className="h-5 w-5" /> Registrar
        </button>
      )}

      {/* ===== Rodapé ===== */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
          <span>Pendências da Fábrica · MVP v1</span>
          <button
            type="button"
            onClick={() => carregar()}
            className="flex items-center gap-1 rounded px-1.5 py-1 hover:text-foreground"
            aria-label="Atualizar dados"
          >
            <RefreshCcw className="h-3 w-3" /> Atualizar
          </button>
        </div>
      </footer>

      {/* ===== Overlays ===== */}
      <PendenciaDetail
        pendencia={detail}
        podeEditar={podeEditar}
        aoFechar={() => setDetail(null)}
        aoMudarStatus={mudarStatus}
        aoEditar={abrirEdicao}
        aoExcluir={excluir}
      />

      <PendenciaForm
        aberto={formAberto}
        editando={editando}
        locaisExistentes={locaisExistentes}
        responsaveisExistentes={responsaveisExistentes}
        aoFechar={() => {
          setFormAberto(false)
          setEditando(null)
        }}
        aoSalvar={salvar}
      />

      {lightboxGaleria && (
        <Lightbox
          fotos={lightboxGaleria.fotos}
          indice={lightboxGaleria.indice}
          legenda={lightboxGaleria.legenda}
          aoFechar={() => setLightboxGaleria(null)}
          aoNavegar={(i) => setLightboxGaleria((l) => (l ? { ...l, indice: i } : l))}
        />
      )}
    </div>
  )
}
