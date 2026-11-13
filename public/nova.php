<?php
// /nova.php — criar pendência (GET formulário · POST grava) e editar (?id=).
// Fotos novas não vão no POST do formulário: o JS comprime no cliente e envia
// depois por fetch (/api/fotos.php) na página de destino (?novo=1 / &salvo=1),
// mantendo o POST pequeno e o fluxo igual ao do app Next.

require __DIR__ . '/../src/boot.php';
require __DIR__ . '/../src/layout.php';

// Criar/editar é coisa de quem tem papel ADMIN (supervisor só vê)
exigirAdmin();

$editando = null;
if (!empty($_GET['id'])) {
    $editando = pendenciaCompleta($_GET['id']);
    if (!$editando) {
        flash('erro', 'Pendência não encontrada.');
        redirecionar('/');
    }
}

// ===== POST: grava criação/edição (só ADMIN) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrfValidar();

    $titulo      = trim($_POST['titulo'] ?? '');
    $local       = trim($_POST['local'] ?? '');
    $responsavel = trim($_POST['responsavel'] ?? '');
    if ($titulo === '' || $local === '' || $responsavel === '') {
        flash('erro', 'Problema, local e responsável são obrigatórios.');
        redirecionar($_SERVER['HTTP_REFERER'] ?? '/');
    }

    $dados = [
        'titulo'          => $titulo,
        'detalhe'         => trim($_POST['detalhe'] ?? '') !== '' ? trim($_POST['detalhe']) : null,
        'local'           => $local,
        'solucao'         => trim($_POST['solucao'] ?? '') !== '' ? trim($_POST['solucao']) : null,
        'acao'            => trim($_POST['acao'] ?? '') !== '' ? trim($_POST['acao']) : null,
        'responsavel'     => $responsavel,
        'prioridade'      => in_array($_POST['prioridade'] ?? '', ['Crítico', 'Alto', 'Moderado', 'Baixo'], true) ? $_POST['prioridade'] : 'Moderado',
        'dataRegistro'    => $_POST['dataRegistro'] ?: date('Y-m-d'),
        'dataLimite'      => ($_POST['dataLimite'] ?? '') !== '' ? $_POST['dataLimite'] . ' 12:00:00' : null,
        'nota'            => trim($_POST['nota'] ?? '') !== '' ? trim($_POST['nota']) : null,
        'ordem'           => trim($_POST['ordem'] ?? '') !== '' ? trim($_POST['ordem']) : null,
        'localInstalacao' => trim($_POST['localInstalacao'] ?? '') !== '' ? trim($_POST['localInstalacao']) : null,
    ];

    $pdo = db();

    if ($editando) {
        // fotos: mantém as marcadas, remove o resto (mesma regra do PATCH do app Next)
        $manter = array_values(array_filter($_POST['manterFotoIds'] ?? [], 'is_string'));
        $st = $pdo->prepare('SELECT "id" FROM "Foto" WHERE "pendenciaId" = ?');
        $st->execute([$editando['id']]);
        $existentes = array_column($st->fetchAll(), 'id');
        $remover = array_diff($existentes, $manter);
        if ($remover) {
            $del = $pdo->prepare('DELETE FROM "Foto" WHERE "id" IN (' . implode(',', array_fill(0, count($remover), '?')) . ')');
            $del->execute(array_values($remover));
        }

        $sql = 'UPDATE "Pendencia" SET "titulo"=?, "detalhe"=?, "local"=?, "solucao"=?, "acao"=?, "responsavel"=?, "prioridade"=?, "dataRegistro"=?, "dataLimite"=?, "nota"=?, "ordem"=?, "localInstalacao"=?, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=?';
        $pdo->prepare($sql)->execute([...array_values($dados), $editando['id']]);
        flash('ok', "Pendência #{$editando['numero']} atualizada.");
        redirecionar('/pendencia.php?id=' . $editando['id'] . '&salvo=1');
    }

    $id = novoId();
    $numero = proximoNumero(); // contador atômico — sem colisão em registros simultâneos
    $usuario = usuarioAtual();
    try {
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO "Pendencia"
                       ("id","numero","titulo","detalhe","local","solucao","acao","responsavel","prioridade","status","dataRegistro","dataLimite","nota","ordem","localInstalacao","registradoPor","origem","createdAt","updatedAt")
                       VALUES (?,?,?,?,?,?,?,?,?,"Pendente",?,?,?,?,?,?, "App", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
            ->execute([
                $id, $numero,
                $dados['titulo'], $dados['detalhe'], $dados['local'], $dados['solucao'], $dados['acao'],
                $dados['responsavel'], $dados['prioridade'],
                $dados['dataRegistro'], $dados['dataLimite'], $dados['nota'], $dados['ordem'], $dados['localInstalacao'],
                $usuario['nome'],
            ]);
        $pdo->prepare('INSERT INTO "HistoricoItem" ("id","pendenciaId","status","comentario","autor","criadoEm")
                       VALUES (?,?,"Pendente","Pendência registrada",?,CURRENT_TIMESTAMP)')
            ->execute([novoId(), $id, $usuario['nome']]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        flash('erro', 'Não foi possível registrar a pendência. Tente de novo.');
        redirecionar($_SERVER['HTTP_REFERER'] ?? '/');
    }
    redirecionar('/pendencia.php?id=' . $id . '&novo=1');
}

// ===== GET: formulário =====
$locais       = array_unique(array_column(pendenciasTodas(), 'local'));
$responsaveis = array_unique(array_merge(['Manutenção', 'Limpeza'], array_column(pendenciasTodas(), 'responsavel')));
sort($locais);
sort($responsaveis);

const SOLUCOES = ['Reparo', 'Substituição', 'Higienização', 'Instalação de peça faltante', 'Remoção de material', 'Remoção de instalação', 'Outra'];
const PRIORIDADES = ['Crítico', 'Alto', 'Moderado', 'Baixo'];

$valor = fn(string $campo, string $padrao = '') => e($editando[$campo] ?? $padrao);
layoutTopo($editando ? 'Editar #' . $editando['numero'] : 'Nova pendência');
?>
<form class="cartao formulario" method="post" action="/nova.php<?= $editando ? '?id=' . e($editando['id']) : '' ?>"
      data-form-fotos <?= $editando ? ' data-editando="1"' : '' ?>>
  <?= campoCsrf() ?>
  <h2 class="form-titulo"><?= $editando ? 'Editar pendência #' . (int) $editando['numero'] : 'Nova pendência' ?></h2>

  <div class="campo">
    <label for="f-titulo">Problema encontrado</label>
    <input id="f-titulo" name="titulo" required value="<?= $valor('titulo') ?>" placeholder="Ex.: porta da câmara fria desalinhada">
  </div>

  <div class="campo">
    <label for="f-detalhe">Detalhamento (opcional)</label>
    <textarea id="f-detalhe" name="detalhe" rows="3" placeholder="Descreva o que aconteceu, quando começou…"><?= $valor('detalhe') ?></textarea>
  </div>

  <div class="campo">
    <label for="f-local">Onde o problema foi identificado?</label>
    <input id="f-local" name="local" required list="locais" value="<?= $valor('local') ?>" placeholder="Ex.: Cozinha industrial">
    <datalist id="locais"><?php foreach ($locais as $l): ?><option value="<?= e($l) ?>"><?php endforeach; ?></datalist>
  </div>

  <div class="campo">
    <label for="f-solucao">Solução necessária</label>
    <select id="f-solucao" name="solucao">
      <?php foreach (SOLUCOES as $s): ?>
        <option<?= ($editando['solucao'] ?? '') === $s ? ' selected' : '' ?>><?= e($s) ?></option>
      <?php endforeach; ?>
    </select>
  </div>

  <div class="campo">
    <label for="f-acao">Ação - Facilities (opcional)</label>
    <input id="f-acao" name="acao" value="<?= $valor('acao') ?>" placeholder="O que a equipe de facilities precisa fazer">
  </div>

  <div class="grade-2">
    <div class="campo">
      <label for="f-prioridade">Prioridade</label>
      <select id="f-prioridade" name="prioridade">
        <?php foreach (PRIORIDADES as $pr): ?>
          <option<?= ($editando['prioridade'] ?? 'Moderado') === $pr ? ' selected' : '' ?>><?= e($pr) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div class="campo">
      <label for="f-responsavel">Responsável - Execução</label>
      <input id="f-responsavel" name="responsavel" required list="responsaveis" value="<?= $valor('responsavel', 'Manutenção') ?>">
      <datalist id="responsaveis"><?php foreach ($responsaveis as $r): ?><option value="<?= e($r) ?>"><?php endforeach; ?></datalist>
    </div>
  </div>

  <div class="grade-2">
    <div class="campo">
      <label for="f-dataRegistro">Data de registro</label>
      <input id="f-dataRegistro" name="dataRegistro" type="date" required value="<?= e(substr($editando['dataRegistro'] ?? '', 0, 10) ?: hojeISO()) ?>">
    </div>
    <div class="campo">
      <label for="f-dataLimite">Data limite (opcional)</label>
      <input id="f-dataLimite" name="dataLimite" type="date" value="<?= e(substr($editando['dataLimite'] ?? '', 0, 10)) ?>">
    </div>
  </div>

  <?php if ($editando && $editando['fotos']): ?>
    <div class="campo">
      <span class="rotulo-estatico">Fotos — desmarque as que devem ser excluídas</span>
      <div class="grade-fotos grade-fotos-form">
        <?php foreach ($editando['fotos'] as $f): ?>
          <label class="foto-manter">
            <input type="checkbox" name="manterFotoIds[]" value="<?= e($f['id']) ?>" checked>
            <img src="<?= e($f['thumbUrl']) ?>" alt="<?= e($f['nome'] ?? 'Foto') ?>">
            <span class="foto-manter-texto">manter</span>
          </label>
        <?php endforeach; ?>
      </div>
    </div>
  <?php endif; ?>

  <div class="campo" data-campo-fotos>
    <label>Fotos (opcional — a câmera do celular funciona aqui)</label>
    <div class="fotos-entrar">
      <label class="btn btn-outline"><input type="file" accept="image/*" capture="environment" multiple hidden data-entrada-fotos><?= icone('camera') ?> Câmera / galeria</label>
    </div>
    <div class="grade-fotos grade-fotos-form" data-fotos-novas></div>
  </div>

  <?php if (!$editando): ?>
  <div class="grade-3">
    <div class="campo">
      <label for="f-nota">Nota</label>
      <input id="f-nota" name="nota" value="<?= $valor('nota') ?>" placeholder="Nº da nota (opcional)">
    </div>
    <div class="campo">
      <label for="f-ordem">Ordem (OS)</label>
      <input id="f-ordem" name="ordem" value="<?= $valor('ordem') ?>" placeholder="Nº da OS (opcional)">
    </div>
    <div class="campo">
      <label for="f-localInst">Local de instalação</label>
      <input id="f-localInst" name="localInstalacao" value="<?= $valor('localInstalacao') ?>" placeholder="Onde a nota/OS foi instalada">
    </div>
  </div>
  <?php endif; ?>

  <div class="form-acoes">
    <a class="btn btn-outline" href="<?= $editando ? '/pendencia.php?id=' . e($editando['id']) : '/' ?>">Cancelar</a>
    <button type="submit" class="btn btn-principal"><?= $editando ? 'Salvar alterações' : 'Registrar pendência' ?></button>
  </div>
</form>
<?php layoutFim() ?>
