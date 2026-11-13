<?php
// Layout compartilhado: topo com abas, flashes e rodapé de scripts.

if (!defined('DIR_RAIZ')) exit('Acesso direto proibido');

function layoutTopo(string $titulo, string $aba = ''): void
{
    $usuario = usuarioAtual();
    $admin = podeEditar();
    $abas = [
        'lista'  => ['Lista', 'list'],
        'kanban' => ['Kanban', 'grid'],
        'fotos'  => ['Fotos', 'images'],
    ]; ?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="<?= e(csrfToken()) ?>">
<meta name="theme-color" content="#0a0a0a">
<title><?= e($titulo) ?> — Pendências da Fábrica</title>
<link rel="stylesheet" href="/assets/app.css">
<script>
// Tema antes do primeiro paint (padrão: escuro, como no app Next)
(function(){try{if((localStorage.getItem('tema')||'dark')==='light')document.documentElement.classList.add('claro')}catch(e){}})();
</script>
</head>
<body>
<header class="topo">
  <a class="marca" href="/">
    <span class="marca-logo" aria-hidden="true">P</span>
    <span class="marca-texto"><strong>Pendências da Fábrica</strong><small>Instalações · Facilities</small></span>
  </a>
  <nav class="abas" aria-label="Visualizações">
    <?php foreach ($abas as $chave => [$rotulo, $icone]): ?>
      <a href="/?aba=<?= e($chave) ?>" class="aba<?= $aba === $chave ? ' ativa' : '' ?>"<?= $aba === $chave ? ' aria-current="page"' : '' ?>>
        <?= icone($icone) ?><span><?= e($rotulo) ?></span>
      </a>
    <?php endforeach; ?>
  </nav>
  <div class="topo-acoes">
    <a class="btn btn-ghost" href="/?acao=csv" title="Exportar CSV"><?= icone('download') ?><span class="esconde-celular">CSV</span></a>
    <button type="button" class="btn btn-ghost btn-icone" id="tema" title="Alternar tema" aria-label="Alternar tema claro/escuro"><?= icone('sun') ?></button>
    <?php if ($usuario): ?>
      <span class="chip-usuario<?= $admin ? '' : ' chip-leitura' ?>" title="<?= $admin ? 'Você pode editar' : 'Seu perfil só consulta' ?>">
        <?= icone('user') ?><?= e($usuario['nome']) ?><?= $admin ? '' : ' · só leitura' ?>
      </span>
      <form method="post" action="/logout.php" class="inline">
        <?= campoCsrf() ?>
        <button type="submit" class="btn btn-ghost btn-icone" title="Sair"><?= icone('log-out') ?><span class="esconde-celular">Sair</span></button>
      </form>
    <?php endif; ?>
    <?php if ($admin): ?>
      <a class="btn btn-principal esconde-celular" href="/nova.php"><?= icone('plus') ?> Nova pendência</a>
    <?php endif; ?>
  </div>
</header>
<?php foreach (flashConsumir() as $f): ?>
  <div class="flash flash-<?= e($f['tipo']) ?>" role="status"><?= icone($f['tipo'] === 'erro' ? 'alert' : 'check') ?> <?= e($f['msg']) ?></div>
<?php endforeach; ?>
<main class="conteudo">
<?php
}

function layoutFim(): void
{ ?>
</main>
<div class="lightbox" id="lightbox" hidden>
  <button type="button" class="lightbox-fundo" data-fechar aria-label="Fechar"></button>
  <figure class="lightbox-corpo">
    <img id="lightbox-img" alt="">
    <figcaption id="lightbox-legenda"></figcaption>
    <button type="button" class="lightbox-nav lightbox-ant" data-nav="-1" aria-label="Foto anterior">‹</button>
    <button type="button" class="lightbox-nav lightbox-prox" data-nav="1" aria-label="Próxima foto">›</button>
    <button type="button" class="lightbox-fechar" data-fechar aria-label="Fechar">×</button>
  </figure>
</div>
<script src="/assets/app.js"></script>
</body>
</html>
<?php }
