<?php
// /fotos.php?id= — devolve a foto em resolução completa (para o lightbox).
// O thumb vai inline no HTML; a imagem grande é buscada só quando ampliar.

require __DIR__ . '/../src/boot.php';

$st = db()->prepare('SELECT "dataUrl" FROM "Foto" WHERE "id" = ?');
$st->execute([$_GET['id'] ?? '']);
$foto = $st->fetch();

if (!$foto || !preg_match('#^data:image/jpeg;base64,(.+)$#', $foto['dataUrl'], $m)) {
    http_response_code(404);
    exit('Foto não encontrada.');
}

header('Content-Type: image/jpeg');
header('Cache-Control: private, max-age=86400');
header('Content-Length: ' . strlen($bin = base64_decode($m[1])));
echo $bin;
