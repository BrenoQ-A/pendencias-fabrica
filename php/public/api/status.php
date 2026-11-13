<?php
// POST /api/status.php — muda status e registra no histórico (só ADMIN).
// Usado pelos formulários do kanban e do detalhe (POST-redirect-GET).

require __DIR__ . '/../../src/boot.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirecionar('/');
csrfValidar();
exigirAdmin();

$id     = $_POST['id'] ?? '';
$status = $_POST['status'] ?? '';
$volto  = $_POST['voltar'] ?? '/';

// destino só interno (evita redirect aberto)
if (!is_string($volto) || !str_starts_with($volto, '/') || str_starts_with($volto, '//')) $volto = '/';

const STATUS_VALIDOS = ['Pendente', 'Em andamento', 'Concluído'];
if (!in_array($status, STATUS_VALIDOS, true)) {
    flash('erro', 'Status inválido.');
    redirecionar($volto);
}

$p = pendenciaCompleta($id);
if (!$p) {
    flash('erro', 'Pendência não encontrada.');
    redirecionar($volto);
}

if ($p['status'] === $status) {
    flash('ok', 'A pendência já estava nesse status.');
    redirecionar($volto);
}

$usuario = usuarioAtual();
$pdo = db();
$pdo->prepare('UPDATE "Pendencia" SET "status" = ?, "resolvidoEm" = CASE WHEN ? = "Concluído" THEN CURRENT_TIMESTAMP ELSE NULL END, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?')
    ->execute([$status, $status, $id]);
$pdo->prepare('INSERT INTO "HistoricoItem" ("id","pendenciaId","status","comentario","autor","criadoEm") VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)')
    ->execute([
        novoId(), $id, $status,
        trim($_POST['comentario'] ?? '') !== '' ? trim($_POST['comentario']) : null,
        $usuario['nome'],
    ]);

flash('ok', "Pendência #{$p['numero']} agora está \"{$status}\".");
redirecionar($volto);
