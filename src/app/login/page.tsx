'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ConteudoLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const proximoBruto = params.get('proximo') ?? '/'
  // só aceita caminhos internos (evita redirect aberto para outros sites)
  const proximo = proximoBruto.startsWith('/') && !proximoBruto.startsWith('//') ? proximoBruto : '/'

  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setErro(null)
    setEnviando(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      })
      if (res.ok) {
        router.replace(proximo)
        router.refresh()
        return
      }
      const data = await res.json().catch(() => null)
      setErro(data?.erro ?? 'Não foi possível entrar. Tente novamente.')
    } catch {
      setErro('Falha de conexão. Verifique a rede e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-2xl font-black text-white shadow-lg shadow-orange-600/25"
            aria-hidden
          >
            P
          </div>
          <div>
            <h1 className="text-xl font-bold">Pendências da Fábrica</h1>
            <p className="text-sm text-muted-foreground">Acesso restrito — informe suas credenciais</p>
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          {erro && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário</Label>
            <Input
              id="usuario"
              name="usuario"
              autoComplete="username"
              placeholder="ex.: admin"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                name="senha"
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={enviando || !usuario || !senha}
            className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700"
          >
            {enviando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso interno · pendências, fotos e histórico são protegidos
        </p>
      </div>
    </div>
  )
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={null}>
      <ConteudoLogin />
    </Suspense>
  )
}
