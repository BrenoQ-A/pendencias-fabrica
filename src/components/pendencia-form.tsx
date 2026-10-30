'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { comprimirFoto, type FotoComprimida } from '@/lib/compress'
import { PRIORIDADES_LISTA, hojeISO } from '@/lib/app-utils'
import type { NovaFotoPayload, Pendencia, PendenciaInput, Prioridade, StatusPendencia } from '@/lib/app-types'
import { cn } from '@/lib/utils'

interface Props {
  aberto: boolean
  /** null = nova pendência; Pendencia = edição */
  editando: Pendencia | null
  locaisExistentes: string[]
  responsaveisExistentes: string[]
  aoFechar: () => void
  aoSalvar: (dados: PendenciaInput, manterFotoIds: string[]) => Promise<void>
}

const SOLUCOES = [
  'Reparo',
  'Substituição',
  'Higienização',
  'Instalação de peça faltante',
  'Remoção de material',
  'Remoção de instalação',
  'Outra',
]
const RESPONSAVEIS_PADRAO = ['Manutenção', 'Limpeza']

interface FotoExistente {
  id: string
  thumbUrl: string
}

/** Formulário de registro/edição — otimizado para celular com câmera. */
export function PendenciaForm({ aberto, editando, locaisExistentes, responsaveisExistentes, aoFechar, aoSalvar }: Props) {
  const { toast } = useToast()
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputGaleria = useRef<HTMLInputElement>(null)

  const [titulo, setTitulo] = useState('')
  const [local, setLocal] = useState('')
  const [novoLocal, setNovoLocal] = useState(false)
  const [prioridade, setPrioridade] = useState<Prioridade>('Moderado')
  const [responsavel, setResponsavel] = useState('Manutenção')
  const [novoResponsavel, setNovoResponsavel] = useState(false)
  const [solucao, setSolucao] = useState<string>('Reparo')
  const [detalhe, setDetalhe] = useState('')
  const [dataRegistro, setDataRegistro] = useState(hojeISO())
  const [dataLimite, setDataLimite] = useState('')
  const [nota, setNota] = useState('')
  const [fotosNovas, setFotosNovas] = useState<FotoComprimida[]>([])
  const [fotosExistentes, setFotosExistentes] = useState<FotoExistente[]>([])
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    if (editando) {
      setTitulo(editando.titulo)
      setLocal(editando.local)
      setNovoLocal(false)
      setPrioridade(editando.prioridade as Prioridade)
      setResponsavel(editando.responsavel)
      setNovoResponsavel(false)
      setSolucao(editando.solucao ?? 'Reparo')
      setDetalhe(editando.detalhe ?? '')
      setDataRegistro(editando.dataRegistro.slice(0, 10))
      setDataLimite(editando.dataLimite ? editando.dataLimite.slice(0, 10) : '')
      setNota(editando.nota ?? '')
      setFotosExistentes(editando.fotos.map((f) => ({ id: f.id, thumbUrl: f.thumbUrl })))
      setFotosNovas([])
    } else {
      setTitulo('')
      setLocal('')
      setNovoLocal(false)
      setPrioridade('Moderado')
      setResponsavel('Manutenção')
      setNovoResponsavel(false)
      setSolucao('Reparo')
      setDetalhe('')
      setDataRegistro(hojeISO())
      setDataLimite('')
      setNota('')
      setFotosExistentes([])
      setFotosNovas([])
    }
  }, [aberto, editando])

  const locaisLista = useMemo(() => [...new Set([...locaisExistentes, 'Cozinha', 'Vestiário Masculino PepsiCo', 'Vestiário Masculino Terceiro', 'Vestiário Feminino', 'Banheiro Masculino ADM', 'Sala de treinamento', 'Área externa'])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [locaisExistentes])
  const respLista = useMemo(() => [...new Set([...RESPONSAVEIS_PADRAO, ...responsaveisExistentes])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [responsaveisExistentes])

  async function adicionarFotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setProcessando(true)
    try {
      const novas: FotoComprimida[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        novas.push(await comprimirFoto(file))
      }
      setFotosNovas((atual) => [...atual, ...novas])
      if (novas.length) {
        toast({ title: `${novas.length} foto(s) adicionada(s)`, description: 'Comprimidas automaticamente para manter o app leve.' })
      }
    } catch {
      toast({ title: 'Erro ao processar foto', description: 'Tente novamente com outra imagem.', variant: 'destructive' })
    } finally {
      setProcessando(false)
      if (inputCamera.current) inputCamera.current.value = ''
      if (inputGaleria.current) inputGaleria.current.value = ''
    }
  }

  async function salvar() {
    if (!titulo.trim() || !local.trim() || !responsavel.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha problema, local e responsável.', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const novas: NovaFotoPayload[] = fotosNovas.map((f) => ({ dataUrl: f.dataUrl, thumbUrl: f.thumbUrl, nome: f.nome }))
      await aoSalvar(
        {
          titulo: titulo.trim(),
          local: local.trim(),
          responsavel: responsavel.trim(),
          prioridade,
          solucao,
          detalhe: detalhe.trim(),
          dataRegistro,
          dataLimite: dataLimite || null,
          nota: nota.trim(),
          registradoPor: editando?.registradoPor ?? 'App',
          fotos: editando ? novas : novas,
        },
        fotosExistentes.map((f) => f.id),
      )
      aoFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editando ? `Editar pendência #${editando.numero}` : 'Nova pendência'}</DialogTitle>
          <DialogDescription>
            {editando ? 'Atualize os dados e as fotos.' : 'Registre o problema encontrado e, se possível, tire uma foto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Problema */}
          <div className="grid gap-1.5">
            <Label htmlFor="f-titulo">Problema encontrado *</Label>
            <Input
              id="f-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Porta da geladeira solta"
              autoFocus={!editando}
            />
          </div>

          {/* Local */}
          <div className="grid gap-1.5">
            <Label htmlFor="f-local">Local *</Label>
            {novoLocal ? (
              <Input id="f-local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Digite o local" />
            ) : (
              <Select
                value={local}
                onValueChange={(v) => (v === '__outro__' ? (setNovoLocal(true), setLocal('')) : setLocal(v))}
              >
                <SelectTrigger id="f-local" className="w-full">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locaisLista.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                  <SelectItem value="__outro__">➕ Outro local (digitar)…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Prioridade */}
            <div className="grid gap-1.5">
              <Label>Prioridade *</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES_LISTA.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div className="grid gap-1.5">
              <Label htmlFor="f-resp">Responsável *</Label>
              {novoResponsavel ? (
                <Input id="f-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Digite o responsável" />
              ) : (
                <Select
                  value={responsavel}
                  onValueChange={(v) => (v === '__outro__' ? (setNovoResponsavel(true), setResponsavel('')) : setResponsavel(v))}
                >
                  <SelectTrigger id="f-resp" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {respLista.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    <SelectItem value="__outro__">➕ Outro (digitar)…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Solução */}
          <div className="grid gap-1.5">
            <Label htmlFor="f-solucao">Solução necessária</Label>
            <Select value={solucao} onValueChange={setSolucao}>
              <SelectTrigger id="f-solucao" className="w-full">
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {SOLUCOES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalhamento */}
          <div className="grid gap-1.5">
            <Label htmlFor="f-detalhe">Detalhamento</Label>
            <Textarea
              id="f-detalhe"
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              placeholder="Detalhes do problema, peças necessárias…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="f-dtreg">Data de registro</Label>
              <Input id="f-dtreg" type="date" value={dataRegistro} onChange={(e) => setDataRegistro(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-dtlim">Data limite</Label>
              <Input id="f-dtlim" type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="f-nota">Nota / OS</Label>
            <Input id="f-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nº da ordem de serviço (opcional)" />
          </div>

          {/* Fotos */}
          <div className="grid gap-1.5">
            <Label>Fotos</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => inputCamera.current?.click()} disabled={processando}>
                <Camera className="h-4 w-4 text-orange-600" /> Tirar foto
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => inputGaleria.current?.click()} disabled={processando}>
                <ImagePlus className="h-4 w-4" /> Da galeria
              </Button>
            </div>
            <input
              ref={inputCamera}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => adicionarFotos(e.target.files)}
              aria-label="Tirar foto com a câmera"
            />
            <input
              ref={inputGaleria}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => adicionarFotos(e.target.files)}
              aria-label="Escolher fotos da galeria"
            />
            {processando && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Comprimindo foto(s)…
              </p>
            )}

            {(fotosExistentes.length > 0 || fotosNovas.length > 0) && (
              <div className="mt-1 flex flex-wrap gap-2">
                {fotosExistentes.map((f) => (
                  <div key={f.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                    { }
                    <img src={f.thumbUrl} alt="Foto já registrada" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotosExistentes((at) => at.filter((x) => x.id !== f.id))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-1 text-white"
                      aria-label="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {fotosNovas.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-orange-400">
                    { }
                    <img src={f.thumbUrl} alt="Nova foto" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotosNovas((at) => at.filter((_, idx) => idx !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-1 text-white"
                      aria-label="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 bg-orange-600 px-1 text-[9px] font-semibold text-white">NOVA</span>
                  </div>
                ))}
              </div>
            )}
            <p className={cn('text-[11px] text-muted-foreground')}>
              As fotos são comprimidas no celular antes de salvar (~10× mais leve que a planilha).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pb-[max(0px,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={aoFechar} disabled={salvando || processando} className="h-11 flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={salvando || processando}
            className="h-11 flex-1 bg-orange-600 text-white hover:bg-orange-700 sm:flex-none sm:min-w-32"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : editando ? 'Salvar alterações' : 'Registrar pendência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { StatusPendencia }
