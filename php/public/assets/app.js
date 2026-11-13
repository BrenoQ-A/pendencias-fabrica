// Pendências da Fábrica — JS do navegador (port dos pontos interativos do app Next):
// 1) compressão de fotos no cliente (canvas) — igual a src/lib/compress.ts
// 2) upload das fotos por fetch após o redirect do formulário (POST pequeno)
// 3) lightbox da galeria/detalhe
// 4) tema claro/escuro (padrão: escuro)
// 5) confirmação de exclusão e mostrar/ocultar senha

(function () {
  'use strict'

  // ===== 4) Tema =====
  var botaoTema = document.getElementById('tema')
  if (botaoTema) {
    botaoTema.addEventListener('click', function () {
      var claro = document.documentElement.classList.toggle('claro')
      try { localStorage.setItem('tema', claro ? 'light' : 'dark') } catch (e) {}
      botaoTema.innerHTML = claro
        ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
    })
  }

  // ===== Mostrar/ocultar senha =====
  document.querySelectorAll('[data-alterna-senha]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var campo = document.querySelector(botao.getAttribute('data-alterna-senha'))
      if (!campo) return
      var ver = campo.type === 'password'
      campo.type = ver ? 'text' : 'password'
      botao.setAttribute('aria-label', ver ? 'Ocultar senha' : 'Mostrar senha')
      botao.innerHTML = ver
        ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M6.7 6.7A10.6 10.6 0 0 0 2 12s3 7 10 7a10.6 10.6 0 0 0 5.3-1.3"/><path d="M9.9 4.2A11 11 0 0 1 12 4c7 0 10 7 10 7a12 12 0 0 1-1.7 2.6"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
    })
  })

  // ===== Confirmação de exclusão =====
  document.querySelectorAll('form[data-confirmar]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      if (!window.confirm(form.getAttribute('data-confirmar'))) ev.preventDefault()
    })
  })

  // ===== 1) Compressão de fotos (port de src/lib/compress.ts) =====
  function carregarImagem (arquivo) {
    return new Promise(function (resolver, rejeitar) {
      var url = URL.createObjectURL(arquivo)
      var img = new Image()
      img.onload = function () { URL.revokeObjectURL(url); resolver(img) }
      img.onerror = function () { URL.revokeObjectURL(url); rejeitar(new Error('Não foi possível ler a imagem.')) }
      img.src = url
    })
  }

  function desenhar (img, maxLado, qualidade) {
    var escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
    var largura = Math.max(1, Math.round(img.naturalWidth * escala))
    var altura = Math.max(1, Math.round(img.naturalHeight * escala))
    var canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    canvas.getContext('2d').drawImage(img, 0, 0, largura, altura)
    return canvas.toDataURL('image/jpeg', qualidade)
  }

  async function comprimirFoto (arquivo) {
    var img = await carregarImagem(arquivo)
    return {
      dataUrl: desenhar(img, 1280, 0.72),   // foto completa (máx. 1280px)
      thumbUrl: desenhar(img, 320, 0.6),    // miniatura (máx. 320px)
      nome: arquivo.name
    }
  }

  var XSRF = (document.querySelector('meta[name="csrf-token"]') || {}).content || ''

  async function enviarJson (url, payload) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': XSRF },
      body: JSON.stringify(payload)
    })
    var dados = await res.json().catch(function () { return {} })
    if (!res.ok) throw new Error(dados.erro || 'Falha na requisição.')
    return dados
  }

  // ===== 2) Formulário de pendência: fila de fotos + upload pós-redirect =====
  var formulario = document.querySelector('form[data-form-fotos]')
  var filaFotos = [] // { dataUrl, thumbUrl, nome }

  if (formulario) {
    var entrada = formulario.querySelector('[data-entrada-fotos]')
    var grade = formulario.querySelector('[data-fotos-novas]')

    function renderizarFila () {
      if (!grade) return
      grade.innerHTML = ''
      filaFotos.forEach(function (foto, i) {
        var div = document.createElement('div')
        div.className = 'foto-nova'
        var img = document.createElement('img')
        img.src = foto.thumbUrl
        img.alt = foto.nome || 'Foto'
        var remover = document.createElement('button')
        remover.type = 'button'
        remover.textContent = '×'
        remover.setAttribute('aria-label', 'Remover foto ' + (i + 1))
        remover.addEventListener('click', function () {
          filaFotos.splice(i, 1)
          renderizarFila()
        })
        div.appendChild(img)
        div.appendChild(remover)
        grade.appendChild(div)
      })
    }

    if (entrada) {
      entrada.addEventListener('change', async function () {
        var arquivos = Array.from(entrada.files || [])
        if (!arquivos.length) return
        var enviadas = 0
        for (var i = 0; i < arquivos.length; i++) {
          try {
            filaFotos.push(await comprimirFoto(arquivos[i]))
            enviadas++
          } catch (e) { /* imagem ilegível: pula */ }
        }
        renderizarFila()
        if (!enviadas) window.alert('Não foi possível ler a(s) imagem(ns).')
        entrada.value = ''
      })
    }

    formulario.addEventListener('submit', function () {
      // guarda a fila para o upload na página de destino (depois do redirect)
      try {
        if (filaFotos.length) sessionStorage.setItem('fotosPendentes', JSON.stringify(filaFotos))
      } catch (e) { /* sem sessionStorage: segue sem fotos */ }
    })
  }

  // Página de destino (?novo=1 / &salvo=1): sobe as fotos da fila
  var artigo = document.querySelector('[data-pendencia-id]')
  var params = new URLSearchParams(window.location.search)
  if (artigo && (params.get('novo') === '1' || params.get('salvo') === '1')) {
    var bruto = null
    try { bruto = sessionStorage.getItem('fotosPendentes') } catch (e) {}
    if (bruto) {
      var fotos = null
      try { fotos = JSON.parse(bruto) } catch (e) {}
      sessionStorage.removeItem('fotosPendentes')
      if (Array.isArray(fotos) && fotos.length) {
        enviarJson('/api/fotos.php', { id: artigo.getAttribute('data-pendencia-id'), fotos: fotos })
          .then(function () { window.location.replace(window.location.pathname + '?id=' + artigo.getAttribute('data-pendencia-id')) })
          .catch(function (erro) { window.alert('As fotos não foram enviadas: ' + erro.message) })
      }
    }
  }

  // ===== 3) Lightbox =====
  var caixa = document.getElementById('lightbox')
  if (caixa && (window.FOTOS_GALERIA || []).length) {
    var imagens = window.FOTOS_GALERIA
    var imgAlvo = caixa.querySelector('#lightbox-img')
    var legenda = caixa.querySelector('#lightbox-legenda')
    var indice = 0
    var cache = {}

    function mostrar (i) {
      indice = (i + imagens.length) % imagens.length
      var item = imagens[indice]
      legenda.textContent = item.legenda || ''
      if (cache[item.id]) { imgAlvo.src = cache[item.id]; return }
      imgAlvo.src = '/fotos.php?id=' + encodeURIComponent(item.id)
      cache[item.id] = imgAlvo.src
    }

    function abrir (i) { caixa.hidden = false; document.body.style.overflow = 'hidden'; mostrar(i) }
    function fechar () { caixa.hidden = true; document.body.style.overflow = '' }

    document.querySelectorAll('[data-lightbox]').forEach(function (botao) {
      botao.addEventListener('click', function () { abrir(parseInt(botao.getAttribute('data-lightbox'), 10) || 0) })
    })
    caixa.querySelectorAll('[data-fechar]').forEach(function (el) { el.addEventListener('click', fechar) })
    caixa.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { mostrar(indice + parseInt(el.getAttribute('data-nav'), 10)) })
    })
    document.addEventListener('keydown', function (ev) {
      if (caixa.hidden) return
      if (ev.key === 'Escape') fechar()
      if (ev.key === 'ArrowLeft') mostrar(indice - 1)
      if (ev.key === 'ArrowRight') mostrar(indice + 1)
    })
  }
})()
