<?php
// POST /api/fotos.php — recebe fotos comprimidas no cliente (JSON via fetch).
//   { "id": "<pendenciaId>", "fotos": [{ "dataUrl", "thumbUrl", "nome" }] }
//   { "acao": "excluir", "fotoId": "<id>" }
// Responde JSON; erros: 401 sem sessão, 403 supervisor/CSRF, 400 payload.

require __DIR__ . '/../../src/boot.php';

header('Content-Type: application/json; charset=utf-8');

function erroJson(int $codigo, string $mensagem): never
{
    http_response_code($codigo);
    echo json_encode(['erro' => $mensagem], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') erroJson(405, 'Método não permitido.');
csrfValidar();

if (usuarioAtual() === null) erroJson(401, 'Não autenticado. Faça login para acessar.');
if (!podeEditar()) erroJson(403, 'Seu perfil só consulta; a edição é para o administrador.');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) erroJson(400, 'Requisição inválida.');

// Exclusão de uma foto (edição desmarcou "manter")
if (($corpo['acao'] ?? '') === 'excluir') {
    $fotoId = $corpo['fotoId'] ?? '';
    if (!is_string($fotoId) || $fotoId === '') erroJson(400, 'fotoId ausente.');
    db()->prepare('DELETE FROM "Foto" WHERE "id" = ?')->execute([$fotoId]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$id = $corpo['id'] ?? '';
if (!is_string($id) || $id === '') erroJson(400, 'id ausente.');
$st = db()->prepare('SELECT "id" FROM "Pendencia" WHERE "id" = ?');
$st->execute([$id]);
if (!$st->fetch()) erroJson(404, 'Pendência não encontrada.');

$fotos = $corpo['fotos'] ?? [];
if (!is_array($fotos)) erroJson(400, 'fotos inválido.');

$inserir = [];
foreach ($fotos as $f) {
    if (!is_array($f)) continue;
    $dataUrl = $f['dataUrl'] ?? '';
    $thumb   = $f['thumbUrl'] ?? '';
    if (!is_string($dataUrl) || !str_starts_with($dataUrl, 'data:image/jpeg;base64,')) continue;
    if (!is_string($thumb) || !str_starts_with($thumb, 'data:image/jpeg;base64,')) continue;
    $inserir[] = [novoId(), $id, $dataUrl, $thumb, is_string($f['nome'] ?? null) ? ($f['nome'] ?: null) : null];
}

foreach ($inserir as [$fid, $pid, $dataUrl, $thumb, $nome]) {
    db()->prepare('INSERT INTO "Foto" ("id","pendenciaId","dataUrl","thumbUrl","nome","criadoEm") VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)')
        ->execute([$fid, $pid, $dataUrl, $thumb, $nome]);
}

echo json_encode(['ok' => true, 'criadas' => count($inserir)], JSON_UNESCAPED_UNICODE);
