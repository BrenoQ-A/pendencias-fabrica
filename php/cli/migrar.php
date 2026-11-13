<?php
// Cria o banco data/pendencias.db com o schema completo (php/sql/schema.sql).
// Uso: php cli/migrar.php
// (banco novo) ou para conferir se o schema já existe.

if (PHP_SAPI !== 'cli') exit('Somente via CLI');
define('DIR_RAIZ', dirname(__DIR__));
require DIR_RAIZ . '/src/db.php';

$arquivo = DIR_RAIZ . '/data/pendencias.db';
if (is_file($arquivo)) {
    $existe = db()->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Pendencia'")->fetchColumn();
    if ($existe) {
        echo "Banco já existe com schema aplicado: $arquivo (nada a fazer)\n";
        exit(0);
    }
}

$sql = file_get_contents(DIR_RAIZ . '/sql/schema.sql');
db()->exec($sql);

$tablas = db()->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
echo "✓ Schema criado em $arquivo\n✓ Tabelas: " . implode(', ', $tablas) . "\n";
$valor = db()->query("SELECT \"valor\" FROM \"Contador\" WHERE \"chave\" = 'Pendencia'")->fetchColumn();
echo "✓ Contador 'Pendencia' iniciado em: $valor\n";
