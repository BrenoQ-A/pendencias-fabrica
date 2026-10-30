'use client'

import { useMemo, useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Pendencia } from '@/lib/app-types'

export interface Filtros {
  busca: string
  status: string // Todos | Atrasada | Pendente | Em andamento | Concluído
  local: string // Todos | <local>
  responsavel: string
  prioridade: string
}

export const FILTROS_INICIAIS: Filtros = { busca: '', status: 'Todos', local: 'Todos', responsavel: 'Todos', prioridade: 'Todos' }

interface Props {
  itens: Pendencia[]
  filtros: Filtros
  aoMudar: (f: Filtros) => void
}

/** Barra de filtros: busca + status/local/responsável/prioridade (colapsável no celular). */
export function FiltersBar({ itens, filtros, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false)

  const locais = useMemo(() => [...new Set(itens.map((p) => p.local))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [itens])
  const responsaveis = useMemo(
    () => [...new Set(itens.map((p) => p.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [itens],
  )

  const ativos =
    (filtros.status !== 'Todos' ? 1 : 0) +
    (filtros.local !== 'Todos' ? 1 : 0) +
    (filtros.responsavel !== 'Todos' ? 1 : 0) +
    (filtros.prioridade !== 'Todos' ? 1 : 0)

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filtros.busca}
            onChange={(e) => aoMudar({ ...filtros, busca: e.target.value })}
            placeholder="Buscar por problema, nº, nota…"
            className="pl-8 h-10"
            aria-label="Buscar pendências"
          />
          {filtros.busca && (
            <button
              type="button"
              onClick={() => aoMudar({ ...filtros, busca: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant={aberto || ativos ? 'secondary' : 'outline'}
          onClick={() => setAberto((v) => !v)}
          className="h-10 shrink-0 gap-1.5"
          aria-expanded={aberto}
        >
          <Filter className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Filtros</span>
          {ativos > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
              {ativos}
            </span>
          )}
        </Button>
      </div>

      {aberto && (
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Select value={filtros.status} onValueChange={(v) => aoMudar({ ...filtros, status: v })}>
            <SelectTrigger className="h-10" aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Status: todos</SelectItem>
              <SelectItem value="Atrasada">⚠ Atrasadas</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.prioridade} onValueChange={(v) => aoMudar({ ...filtros, prioridade: v })}>
            <SelectTrigger className="h-10" aria-label="Filtrar por prioridade">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Prioridade: todas</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Moderado">Moderado</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.local} onValueChange={(v) => aoMudar({ ...filtros, local: v })}>
            <SelectTrigger className="h-10" aria-label="Filtrar por local">
              <SelectValue placeholder="Local" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Local: todos</SelectItem>
              {locais.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtros.responsavel} onValueChange={(v) => aoMudar({ ...filtros, responsavel: v })}>
            <SelectTrigger className="h-10" aria-label="Filtrar por responsável">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Responsável: todos</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {ativos > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => aoMudar({ ...FILTROS_INICIAIS, busca: filtros.busca })}
              className="col-span-2 h-9 text-muted-foreground lg:col-span-4"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Aplica os filtros em memória. */
export function filtrar(itens: Pendencia[], f: Filtros, isAtrasadaFn: (p: Pendencia) => boolean): Pendencia[] {
  const q = f.busca.trim().toLowerCase()
  return itens.filter((p) => {
    if (f.status !== 'Todos') {
      if (f.status === 'Atrasada') {
        if (!isAtrasadaFn(p)) return false
      } else if (p.status !== f.status) return false
    }
    if (f.local !== 'Todos' && p.local !== f.local) return false
    if (f.responsavel !== 'Todos' && p.responsavel !== f.responsavel) return false
    if (f.prioridade !== 'Todos' && p.prioridade !== f.prioridade) return false
    if (q) {
      const alvo = `${p.numero} ${p.titulo} ${p.detalhe ?? ''} ${p.local} ${p.nota ?? ''} ${p.registradoPor ?? ''} ${p.responsavel}`.toLowerCase()
      if (!alvo.includes(q)) return false
    }
    return true
  })
}
