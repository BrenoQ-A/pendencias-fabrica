<?php
// POST /api/excluir.php — exclui pendência e fotos/histórico (cascade; só ADMIN).

require __DIR__ . '/../../src/boot.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirecionar('/');
csrfValidar();
exigirAdmin();

$id = $_POST['id'] ?? '';
$p = pendenciaCompleta(is_string($id) ? $id : '');
if (!$p) {
    flash('erro', 'Pendência não encontrada.');
    redirecionar('/');
}

db()->prepare('DELETE FROM "Pendencia" WHERE "id" = ?')->execute([$p['id']]);
flash('ok', "Pendência #{$p['numero']} excluída.");
redirecionar('/');
