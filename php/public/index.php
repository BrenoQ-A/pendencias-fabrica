<?php
// Página principal: abas Lista / Kanban / Fotos, indicadores, filtros e CSV.
// A base é pequena (registro de fábrica): carrega tudo e filtra em memória,
// mesma estratégia do app Next.

require __DIR__ . '/../src/boot.php';
require __DIR__ . '/../src/layout.php';

exigirLogin();

// ===== Exportação CSV (antes de qualquer HTML) =====
if (($_GET['acao'] ?? '') === 'csv') {
    $itens = pendenciasTodas();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="pendencias-' . hojeISO() . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM para o Excel abrir acentos corretamente
    // escape explícito: o padrão de fputcsv está deprecado no PHP 8.4+
    fputcsv($out, ['Nº', 'Problema', 'Local', 'Prioridade', 'Status', 'Atrasada', 'Data registro', 'Data limite', 'Responsável', 'Solução', 'Ação', 'Detalhamento', 'Nota', 'Ordem (OS)', 'Local instalação', 'Registrado por', 'Origem', 'Fotos'], ',', '"', '\\');
    foreach ($itens as $p) {
        fputcsv($out, [
            $p['numero'], $p['titulo'], $p['local'], $p['prioridade'], $p['status'],
            isAtrasada($p) ? 'Sim' : 'Não',
            formatarData($p['dataRegistro']),
            $p['dataLimite'] ? formatarData($p['dataLimite']) : '',
            $p['responsavel'], $p['solucao'] ?? '', $p['acao'] ?? '', $p['detalhe'] ?? '',
            $p['nota'] ?? '', $p['ordem'] ?? '', $p['localInstalacao'] ?? '',
            $p['registradoPor'] ?? '', $p['origem'], count($p['fotos']),
        ], ',', '"', '\\');
    }
    fclose($out);
    exit;
}

$aba = $_GET['aba'] ?? 'lista';
if (!in_array($aba, ['lista', 'kanban', 'fotos'], true)) $aba = 'lista';

// ===== Dados =====
$itens = pendenciasTodas();

$busca       = $_GET['busca'] ?? '';
$fStatus     = $_GET['status'] ?? 'Todos';
$fLocal      = $_GET['local'] ?? 'Todos';
$fResponsavel= $_GET['responsavel'] ?? 'Todos';
$fPrioridade = $_GET['prioridade'] ?? 'Todos';
$filtrados   = filtrarPendencias($itens, $busca, $fStatus, $fLocal, $fResponsavel, $fPrioridade);

$locais       = array_unique(array_column($itens, 'local'));
$responsaveis = array_unique(array_column($itens, 'responsavel'));
sort($locais);
sort($responsaveis);

// ===== Indicadores (base completa, como no app Next) =====
$total      = count($itens);
$concluidas = count(array_filter($itens, fn($p) => $p['status'] === 'Concluído'));
$atrasadas  = count(array_filter($itens, 'isAtrasada'));
$andamento  = count(array_filter($itens, fn($p) => $p['status'] === 'Em andamento'));
$pendentes  = count(array_filter($itens, fn($p) => $p['status'] === 'Pendente'));
$taxa       = $total ? (int) round($concluidas / $total * 100) : 0;

$admin = podeEditar();
$ativosFiltros = ($fStatus !== 'Todos' ? 1 : 0) + ($fLocal !== 'Todos' ? 1 : 0) + ($fResponsavel !== 'Todos' ? 1 : 0) + ($fPrioridade !== 'Todos' ? 1 : 0);

/** Cartão compacto de pendência (lista e kanban) — espelho do PendenciaCard. */
function renderizarCard(array $p): void
{
    $prazo = rotuloPrazo($p);
    $thumb = $p['fotos'][0]['thumbUrl'] ?? null;
    ?>
    <a class="cartao cartao-p<?= isAtrasada($p) ? ' cartao-atrasada' : '' ?>" href="/pendencia.php?id=<?= e($p['id']) ?>" aria-label="Abrir pendência nº <?= (int) $p['numero'] ?>: <?= e($p['titulo']) ?>">
      <span class="miniatura">
        <?php if ($thumb): ?>
          <img src="<?= e($thumb) ?>" alt="Foto da pendência <?= (int) $p['numero'] ?>" loading="lazy">
        <?php else: ?>
          <?= icone('image-off', 'ic mudo') ?>
        <?php endif; ?>
        <?php if (count($p['fotos']) > 1): ?><span class="miniatura-total"><?= icone('images', 'ic xs') ?><?= count($p['fotos']) ?></span><?php endif; ?>
      </span>
      <span class="cartao-corpo">
        <span class="cartao-titulo"><span class="linha-2"><?= e($p['titulo']) ?></span><span class="cartao-numero">#<?= (int) $p['numero'] ?></span></span>
        <span class="cartao-local"><?= icone('map-pin', 'ic xs') ?> <?= e($p['local']) ?></span>
        <span class="cartao-badges">
          <span class="badge <?= CLASSE_STATUS[$p['status']] ?? '' ?>"><?= e($p['status']) ?></span>
          <span class="badge <?= CLASSE_PRIORIDADE[$p['prioridade']] ?? '' ?>"><?= e($p['prioridade']) ?></span>
          <?php if ($prazo['atrasada']): ?><span class="badge badge-atrasada">⚠ <?= e($prazo['texto']) ?></span>
          <?php elseif ($p['dataLimite'] && $p['status'] !== 'Concluído'): ?><span class="prazo-texto"><?= e($prazo['texto']) ?></span><?php endif; ?>
        </span>
      </span>
    </a>
<?php } ?>

<?php layoutTopo('Pendências', $aba) ?>

<?php if ($total === 0): ?>
  <div class="vazio-grande">
    <?= icone('clipboard', 'ic xl') ?>
    <h2>Nenhuma pendência ainda</h2>
    <p><?= $admin ? 'Registre a primeira pelo botão “Nova pendência”.' : 'Quando houver registros, eles aparecem aqui.' ?></p>
  </div>
<?php else: ?>

<section class="stats" aria-label="Indicadores das pendências">
  <div class="stat"><span class="stat-rotulo">Total</span><span class="stat-valor"><?= $total ?></span><span class="stat-sub"><?= $pendentes ?> pendente<?= $pendentes === 1 ? '' : 's' ?></span></div>
  <div class="stat<?= $atrasadas > 0 ? ' stat-erro' : ' stat-ok' ?>"><span class="stat-rotulo">Atrasadas</span><span class="stat-valor"><?= $atrasadas ?></span><span class="stat-sub"><?= $atrasadas > 0 ? 'prazo vencido' : 'nenhuma em atraso' ?></span></div>
  <div class="stat stat-andamento"><span class="stat-rotulo">Em andamento</span><span class="stat-valor"><?= $andamento ?></span><span class="stat-sub">em execução</span></div>
  <div class="stat stat-ok"><span class="stat-rotulo">Concluídas</span><span class="stat-valor"><?= $concluidas ?></span><span class="stat-sub"><?= $taxa ?>% do total</span></div>
  <div class="progresso">
    <div class="progresso-linha"><span class="progresso-rotulo">Progresso geral de conclusão</span><strong><?= $taxa ?>%</strong></div>
    <div class="progresso-barra" role="progressbar" aria-valuenow="<?= $taxa ?>" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso geral: <?= $taxa ?>% concluído"><div class="progresso-fill" style="width:<?= $taxa ?>%"></div></div>
  </div>
</section>

<form class="filtros" method="get" action="/">
  <input type="hidden" name="aba" value="<?= e($aba) ?>">
  <div class="filtro-busca">
    <?= icone('search', 'ic busca-icone') ?>
    <input type="search" name="busca" value="<?= e($busca) ?>" placeholder="Buscar por problema, nº, nota…" aria-label="Buscar pendências">
  </div>
  <select name="status" aria-label="Filtrar por status">
    <option value="Todos">Status: todos</option>
    <option value="Atrasada"<?= $fStatus === 'Atrasada' ? ' selected' : '' ?>>⚠ Atrasadas</option>
    <option value="Pendente"<?= $fStatus === 'Pendente' ? ' selected' : '' ?>>Pendente</option>
    <option value="Em andamento"<?= $fStatus === 'Em andamento' ? ' selected' : '' ?>>Em andamento</option>
    <option value="Concluído"<?= $fStatus === 'Concluído' ? ' selected' : '' ?>>Concluído</option>
  </select>
  <select name="prioridade" aria-label="Filtrar por prioridade">
    <option value="Todos">Prioridade: todas</option>
    <?php foreach (['Crítico', 'Alto', 'Moderado', 'Baixo'] as $pr): ?>
      <option<?= $fPrioridade === $pr ? ' selected' : '' ?>><?= e($pr) ?></option>
    <?php endforeach; ?>
  </select>
  <select name="local" aria-label="Filtrar por local">
    <option value="Todos">Local: todos</option>
    <?php foreach ($locais as $l): ?><option<?= $fLocal === $l ? ' selected' : '' ?>><?= e($l) ?></option><?php endforeach; ?>
  </select>
  <select name="responsavel" aria-label="Filtrar por responsável">
    <option value="Todos">Responsável: todos</option>
    <?php foreach ($responsaveis as $r): ?><option<?= $fResponsavel === $r ? ' selected' : '' ?>><?= e($r) ?></option><?php endforeach; ?>
  </select>
  <?php if ($ativosFiltros > 0): ?><a class="btn btn-ghost" href="/?aba=<?= e($aba) ?>"><?= icone('x', 'ic xs') ?> Limpar filtros</a><?php endif; ?>
</form>

<?php if ($aba === 'lista'): ?>
  <div class="grade-lista">
    <?php foreach ($filtrados as $p) renderizarCard($p); ?>
    <?php if (!$filtrados): ?><p class="vazio-filtro">Nenhuma pendência com esses filtros.</p><?php endif; ?>
  </div>

<?php elseif ($aba === 'kanban'): ?>
  <?php
  $colunas = [
    ['status' => 'Pendente',     'classe' => 'col-pendente'],
    ['status' => 'Em andamento', 'classe' => 'col-andamento'],
    ['status' => 'Concluído',    'classe' => 'col-concluido'],
  ];
  ?>
  <div class="kanban">
    <?php foreach ($colunas as $col): $daColuna = array_filter($filtrados, fn($p) => $p['status'] === $col['status']); $nAtrasadas = count(array_filter($daColuna, 'isAtrasada')); ?>
      <section class="kanban-col <?= $col['classe'] ?>" aria-label="<?= e($col['status']) ?>: <?= count($daColuna) ?> pendências">
        <header class="kanban-cabecalho">
          <h3><?= e($col['status']) ?></h3>
          <span class="kanban-contagens">
            <?php if ($nAtrasadas > 0 && $col['status'] !== 'Concluído'): ?><span class="badge badge-atrasada">⚠ <?= $nAtrasadas ?> atrasada<?= $nAtrasadas > 1 ? 's' : '' ?></span><?php endif; ?>
            <span class="kanban-total"><?= count($daColuna) ?></span>
          </span>
        </header>
        <div class="kanban-corpo">
          <?php foreach ($daColuna as $p): ?>
            <?php renderizarCard($p); ?>
            <?php if ($admin): ?>
              <div class="kanban-acoes">
                <?php if ($p['status'] !== 'Pendente'): ?>
                  <form method="post" action="/api/status.php"><?= campoCsrf() ?><input type="hidden" name="id" value="<?= e($p['id']) ?>"><input type="hidden" name="status" value="Pendente"><input type="hidden" name="voltar" value="/?aba=kanban"><button type="submit" class="btn btn-mini"><?= icone('refresh', 'ic xs') ?> Reabrir</button></form>
                <?php endif; ?>
                <?php if ($p['status'] === 'Pendente'): ?>
                  <form method="post" action="/api/status.php"><?= campoCsrf() ?><input type="hidden" name="id" value="<?= e($p['id']) ?>"><input type="hidden" name="status" value="Em andamento"><input type="hidden" name="voltar" value="/?aba=kanban"><button type="submit" class="btn btn-mini btn-violeta"><?= icone('clock', 'ic xs') ?> Iniciar</button></form>
                <?php endif; ?>
                <?php if ($p['status'] !== 'Concluído'): ?>
                  <form method="post" action="/api/status.php"><?= campoCsrf() ?><input type="hidden" name="id" value="<?= e($p['id']) ?>"><input type="hidden" name="status" value="Concluído"><input type="hidden" name="voltar" value="/?aba=kanban"><button type="submit" class="btn btn-mini btn-verde"><?= icone('check', 'ic xs') ?> Concluir</button></form>
                <?php endif; ?>
              </div>
            <?php endif; ?>
          <?php endforeach; ?>
          <?php if (!$daColuna): ?><p class="vazio-filtro">Nada aqui por enquanto 🎉</p><?php endif; ?>
        </div>
      </section>
    <?php endforeach; ?>
  </div>

<?php else: ?>
  <?php $fotos = []; foreach ($filtrados as $p) foreach ($p['fotos'] as $f) $fotos[] = ['f' => $f, 'p' => $p]; ?>
  <?php if (!$fotos): ?>
    <div class="vazio-grande"><?= icone('image-off', 'ic xl') ?><h2>Nenhuma foto</h2><p>Nenhuma foto nas pendências filtradas.</p></div>
  <?php else: ?>
    <div class="grade-fotos" role="list" aria-label="Galeria de fotos das pendências">
      <?php foreach ($fotos as $i => $par): $f = $par['f']; $p = $par['p']; ?>
        <button type="button" role="listitem" class="foto-quadrada" data-lightbox="<?= $i ?>" aria-label="Ver foto de #<?= (int) $p['numero'] ?>: <?= e($p['titulo']) ?>">
          <img src="<?= e($f['thumbUrl']) ?>" alt="Foto da pendência #<?= (int) $p['numero'] ?> — <?= e($p['titulo']) ?>" loading="lazy">
          <span class="foto-legenda">#<?= (int) $p['numero'] ?> <?= e($p['titulo']) ?></span>
          <?php if (isAtrasada($p)): ?><span class="foto-atrasada">ATRASADA</span><?php endif; ?>
        </button>
      <?php endforeach; ?>
    </div>
    <script>
      // Fotos completas para o lightbox (thumbs estão inline; full vem de /fotos.php?id=)
      window.FOTOS_GALERIA = <?= json_encode(array_map(fn($par) => ['id' => $par['f']['id'], 'legenda' => '#' . $par['p']['numero'] . ' — ' . $par['p']['titulo']], $fotos), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
    </script>
  <?php endif; ?>
<?php endif; ?>

<?php endif; ?>

<?php if ($admin): ?>
<a class="fab" href="/nova.php" aria-label="Nova pendência"><?= icone('plus') ?> Registrar</a>
<?php endif; ?>

<?php layoutFim() ?>
