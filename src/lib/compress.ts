// Compressão de imagens no cliente (canvas) — mantém o app leve.
// Fotos ficam em ~150–300 KB (máx. 1280px) + miniatura ~10–25 KB (máx. 320px).

export interface FotoComprimida {
  dataUrl: string
  thumbUrl: string
  nome?: string
}

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    img.src = url
  })
}

function desenhar(img: HTMLImageElement, maxLado: number, qualidade: number): Promise<string> {
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * escala))
  const h = Math.max(1, Math.round(img.naturalHeight * escala))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return Promise.resolve(canvas.toDataURL('image/jpeg', qualidade))
}

/** Comprime uma foto escolhida pelo usuário (câmera ou galeria). */
export async function comprimirFoto(file: File): Promise<FotoComprimida> {
  const img = await carregarImagem(file)
  const [dataUrl, thumbUrl] = await Promise.all([
    desenhar(img, 1280, 0.72),
    desenhar(img, 320, 0.6),
  ])
  return { dataUrl, thumbUrl, nome: file.name }
}
