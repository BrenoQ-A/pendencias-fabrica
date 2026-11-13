<?php
// /pendencia.php?id= — detalhe: fotos, progresso, dados completos, histórico
// e ações de status/edição (só para ADMIN).

require __DIR__ . '/../src/boot.php';
require __DIR__ . '/../src/layout.php';

exigirLogin();

$p = pendenciaCompleta($_GET['id'] ?? '');
if (!$p) {
    flash('erro', 'Pendência não encontrada.');
    redirecionar('/');
}

$admin = podeEditar();
$prazo = rotuloPrazo($p);
$atrasada = isAtrasada($p);
$passos = ['Pendente', 'Em andamento', 'Concluído'];
$passoAtual = array_search($p['status'], $passos, true);

layoutTopo('#' . $p['numero'] . ' ' . $p['titulo']);
?>
<article class="cartao detalhe" data-pendencia-id="<?= e($p['id']) ?>">
  <header class="detalhe-cabecalho">
    <a class="btn btn-ghost btn-voltar" href="/">← Voltar</a>
    <h1><span class="mudo">#<?= (int) $p['numero'] ?></span> <?= e($p['titulo']) ?></h1>
    <div class="badges">
      <span class="badge <?= CLASSE_STATUS[$p['status']] ?? '' ?>"><?= e($p['status']) ?></span>
      <span class="badge <?= CLASSE_PRIORIDADE[$p['prioridade']] ?? '' ?>"><?= e($p['prioridade']) ?></span>
      <?php if ($atrasada): ?><span class="badge badge-atrasada">⚠ atrasada · <?= e($prazo['texto']) ?></span>
      <?php elseif ($p['dataLimite'] && $p['status'] !== 'Concluído'): ?><span class="prazo-texto"><?= e($prazo['texto']) ?></span><?php endif; ?>
    </div>
  </header>

  <?php if ($p['fotos']): ?>
  <div class="grade-fotos" role="list" aria-label="Fotos da pendência">
    <?php foreach ($p['fotos'] as $i => $f): ?>
      <button type="button" role="listitem" class="foto-quadrada" data-lightbox="<?= $i ?>" aria-label="Ampliar foto <?= $i + 1 ?>">
        <img src="<?= e($f['thumbUrl']) ?>" alt="<?= e($f['nome'] ?? 'Foto da pendência') ?>" loading="lazy">
      </button>
    <?php endforeach; ?>
  </div>
  <script>window.FOTOS_GALERIA = <?= json_encode(array_map(fn($f) => ['id' => $f['id'], 'legenda' => 'Foto ' . ($f['nome'] ?? '')], $p['fotos']), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
  <?php endif; ?>

  <section class="progresso-passos" aria-label="Progresso">
    <?php foreach ($passos as $i => $passo): ?>
      <span class="passo<?= $i <= $passoAtual ? ' passo-feito' : '' ?>"><?= $i < $passoAtual ? icone('check', 'ic xs') : ($i + 1) ?> <?= e($passo) ?></span>
    <?php endforeach; ?>
  </section>

  <?php if ($admin): ?>
  <section class="acoes-status">
    <form method="post" action="/api/status.php" class="acoes-status-forma">
      <?= campoCsrf() ?>
      <input type="hidden" name="id" value="<?= e($p['id']) ?>">
      <input type="hidden" name="voltar" value="/pendencia.php?id=<?= e($p['id']) ?>">
      <label for="comentario">Comentário (opcional, fica no histórico)</label>
      <input id="comentario" name="comentario" placeholder="Ex.: peça encomendada, aguardando chegada…">
      <div class="acoes-linhas">
        <?php if ($p['status'] !== 'Pendente'): ?>
          <button type="submit" name="status" value="Pendente" class="btn btn-outline">↩ Reabrir</button>
        <?php endif; ?>
        <?php if ($p['status'] !== 'Em andamento'): ?>
          <button type="submit" name="status" value="Em andamento" class="btn btn-violeta">▶ Em andamento</button>
        <?php endif; ?>
        <?php if ($p['status'] !== 'Concluído'): ?>
          <button type="submit" name="status" value="Concluído" class="btn btn-verde"><?= icone('check', 'ic xs') ?> Concluir</button>
        <?php endif; ?>
      </div>
    </form>
  </section>
  <?php endif; ?>

  <section class="dados">
    <div class="linha-dado"><?= icone('clipboard') ?><div><small>Solução necessária</small><p><?= e($p['solucao'] ?: '—') ?></p></div></div>
    <div class="linha-dado"><?= icone('briefcase') ?><div><small>Ação - Facilities</small><p><?= e($p['acao'] ?: '—') ?></p></div></div>
    <div class="linha-dado"><?= icone('map-pin') ?><div><small>Onde foi identificado</small><p><?= e($p['local']) ?></p></div></div>
    <div class="linha-dado"><?= icone('user') ?><div><small>Responsável - Execução</small><p><?= e($p['responsavel']) ?></p></div></div>
    <div class="linha-dado"><?= icone('clock') ?><div><small>Data de registro / limite</small><p><?= formatarData($p['dataRegistro']) ?><?= $p['dataLimite'] ? ' · limite ' . formatarData($p['dataLimite']) : '' ?></p></div></div>
    <div class="linha-dado"><?= icone('receipt') ?><div><small>Nota</small><p><?= e($p['nota'] ?: '—') ?></p></div></div>
    <div class="linha-dado"><?= icone('hash') ?><div><small>Ordem (OS)</small><p><?= e($p['ordem'] ?: '—') ?></p></div></div>
    <div class="linha-dado"><?= icone('building') ?><div><small>Local de instalação</small><p><?= e($p['localInstalacao'] ?: '—') ?></p></div></div>
    <?php if ($p['notaOriginal']): ?>
      <div class="linha-dado"><?= icone('history') ?><div><small>Texto original da nota (antes da separação)</small><p><?= e($p['notaOriginal']) ?></p></div></div>
    <?php endif; ?>
    <div class="linha-dado"><?= icone('user') ?><div><small>Registrado por</small><p><?= e($p['registradoPor'] ?: '—') ?></p></div></div>
  </section>

  <section class="historico">
    <h2><?= icone('history', 'ic') ?> Histórico</h2>
    <?php foreach ($p['historico'] as $h): ?>
      <div class="historico-item">
        <span class="badge <?= CLASSE_STATUS[$h['status']] ?? '' ?>"><?= e($h['status']) ?></span>
        <div>
          <p><?= e($h['comentario'] ?: '—') ?></p>
          <small><?= e($h['autor'] ?: 'App') ?> · <?= e(formatarData($h['criadoEm'])) ?></small>
        </div>
      </div>
    <?php endforeach; ?>
    <?php if (!$p['historico']): ?><p class="mudo">Sem histórico ainda.</p><?php endif; ?>
  </section>

  <?php if ($admin): ?>
  <footer class="detalhe-acoes">
    <a class="btn btn-outline" href="/nova.php?id=<?= e($p['id']) ?>"><?= icone('pencil', 'ic xs') ?> Editar</a>
    <form method="post" action="/api/excluir.php" data-confirmar="Excluir a pendência #<?= (int) $p['numero'] ?> e suas fotos? Isso não tem volta.">
      <?= campoCsrf() ?>
      <input type="hidden" name="id" value="<?= e($p['id']) ?>">
      <button type="submit" class="btn btn-perigo"><?= icone('trash', 'ic xs') ?> Excluir</button>
    </form>
  </footer>
  <?php endif; ?>
</article>
<?php layoutFim() ?>
