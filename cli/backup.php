<?php
// Backup do banco SQLite — snapshot consistente e compactado (VACUUM INTO).
// Uso: php cli/backup.php [arquivo-destino.db]
// Rotação: mantém os 10 backups mais recentes em data/backups/.

if (PHP_SAPI !== 'cli') exit('Somente via CLI');
define('DIR_RAIZ', dirname(__DIR__));
require DIR_RAIZ . '/src/db.php';

$destino = $argv[1] ?? (DIR_RAIZ . '/data/backups/pendencias-' . date('Y-m-d-His') . '.db');
if (is_file($destino)) exit("Destino já existe: $destino\n");
if (!is_dir(dirname($destino))) mkdir(dirname($destino), 0775, true);

db()->exec("VACUUM INTO '" . str_replace("'", "''", $destino) . "'");
echo "✓ Backup criado: $destino\n";

// restauração: pare o app, substitua data/pendencias.db pelo backup e suba de novo
// rotação: mantém os 10 mais recentes
$antigos = glob(DIR_RAIZ . '/data/backups/pendencias-*.db') ?: [];
usort($antigos, fn($a, $b) => filemtime($b) <=> filemtime($a));
foreach (array_slice($antigos, 10) as $arquivo) {
    @unlink($arquivo);
    echo "  (rotação: removido $arquivo)\n";
}
