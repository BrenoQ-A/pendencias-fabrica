'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ModoTema = 'light' | 'dark' | 'system'

const ORDEM: ModoTema[] = ['light', 'dark', 'system']
const ROTULOS: Record<ModoTema, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  // false no servidor/na hidratação, true depois de montado (evita mismatch)
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Evita mismatch de hidratação: ícone e rótulos só variam após montar
  const modo = ORDEM.includes(theme as ModoTema) ? (theme as ModoTema) : 'system'
  const proximoModo = ORDEM[(ORDEM.indexOf(modo) + 1) % ORDEM.length]
  const Icone = !montado ? Sun : modo === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={() => setTheme(proximoModo)}
      aria-label={montado ? `Tema atual: ${ROTULOS[modo]}. Clique para mudar para ${ROTULOS[proximoModo]}` : 'Alternar tema'}
      title={montado ? `Tema: ${ROTULOS[modo]} → ${ROTULOS[proximoModo]}` : undefined}
    >
      <Icone className="h-4 w-4" />
    </Button>
  )
}
