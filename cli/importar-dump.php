<?php
// Importa um dump SQL do banco Turso (gerado com: turso db shell <banco> .dump)
// para o SQLite local da versão PHP.
//
// Uso:
//   php cli/importar-dump.php dump.sql              # se o banco local ainda não tem pendências
//   php cli/importar-dump.php dump.sql --sobrescrever  # apaga o que existe e importa por cima
//
// O dump do Turso é SQL padrão (CREATE TABLE + INSERTs + BEGIN/COMMIT). Este
// script divide os statements respeitando strings ('' escapadas) e executa um
// a um. Se algo falhar no meio, a transação é desfeita e nada fica pela metade.

if (PHP_SAPI !== 'cli') exit('Somente via CLI');
define('DIR_RAIZ', dirname(__DIR__));
require DIR_RAIZ . '/src/db.php';

$uso = "Uso: php cli/importar-dump.php <arquivo-dump.sql> [--sobrescrever]\n";
$arquivo = $argv[1] ?? '';
$sobrescrever = in_array('--sobrescrever', $argv, true);
if ($arquivo === '' || !is_file($arquivo)) exit($uso);

$sql = file_get_contents($arquivo);

// Divide statements: percorre caractere a caractere respeitando strings e comentários
$statements = [];
$atual = '';
$emString = false;
$linhas = explode("\n", $sql);
foreach ($linhas as $linha) {
    $trim = ltrim($linha);
    if (!$emString && (str_starts_with($trim, '--') || $trim === '')) continue; // comentário/linha vazia
    $tam = strlen($linha);
    for ($i = 0; $i < $tam; $i++) {
        $c = $linha[$i];
        if ($emString) {
            $atual .= $c;
            if ($c === "'") {
                if ($i + 1 < $tam && $linha[$i + 1] === "'") { $atual .= "'"; $i++; } // '' escapado
                else $emString = false;
            }
            continue;
        }
        if ($c === "'") { $emString = true; $atual .= $c; continue; }
        if ($c === ';') { $statements[] = trim($atual); $atual = ''; continue; }
        $atual .= $c;
    }
    $atual .= "\n";
}
if (trim($atual) !== '') $statements[] = trim($atual);
$statements = array_values(array_filter($statements, fn($s) => $s !== ''));

if (!$statements) exit("Arquivo sem statements SQL.\n");

// Confere estado atual do banco local
$pdo = db();
$temSchema = (bool) $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Pendencia'")->fetchColumn();
if (!$temSchema) exit("Banco local sem schema — rode primeiro: php cli/migrar.php\n");
$jaTem = (int) $pdo->query('SELECT COUNT(*) FROM "Pendencia"')->fetchColumn();
if ($jaTem > 0 && !$sobrescrever) {
    echo "Banco local já tem $jaTem pendência(s). Use --sobrescrever para apagar e importar por cima.\n";
    exit(1);
}

$pdo->beginTransaction();
try {
    if ($sobrescrever) {
        $pdo->exec('DELETE FROM "HistoricoItem"');
        $pdo->exec('DELETE FROM "Foto"');
        $pdo->exec('DELETE FROM "Pendencia"');
        $pdo->exec('DELETE FROM "Usuario"');
        $pdo->exec('DELETE FROM "Contador"');
    }
    $feitas = 0;
    foreach ($statements as $st) {
        $upper = strtoupper(substr(ltrim($st), 0, 6));
        if (str_starts_with($upper, 'BEGIN') || str_starts_with($upper, 'COMMIT')) continue; // transação é nossa
        if (str_starts_with($upper, 'PRAGMA')) continue; // foreign_keys já configurada na conexão
        if (preg_match('/^CREATE\s+(TABLE|UNIQUE\s+INDEX|INDEX)/i', ltrim($st))) continue; // schema vem do migrar.php
        $pdo->exec($st);
        $feitas++;
    }
    // Reposiciona o contador no maior número importado
    $pdo->exec("DELETE FROM \"Contador\" WHERE \"chave\" = 'Pendencia'");
    $pdo->exec("INSERT INTO \"Contador\" (\"chave\",\"valor\") SELECT 'Pendencia', COALESCE(MAX(\"numero\"),0) FROM \"Pendencia\"");
    $pdo->commit();
    $pendencias = $pdo->query('SELECT COUNT(*) FROM "Pendencia"')->fetchColumn();
    $fotos = $pdo->query('SELECT COUNT(*) FROM "Foto"')->fetchColumn();
    $usuarios = $pdo->query('SELECT COUNT(*) FROM "Usuario"')->fetchColumn();
    $contador = $pdo->query("SELECT \"valor\" FROM \"Contador\" WHERE \"chave\" = 'Pendencia'")->fetchColumn();
    echo "✓ Importado: $feitas statements · $pendencias pendências · $fotos fotos · $usuarios usuários\n";
    echo "✓ Contador reposicionado em: $contador\n";
} catch (PDOException $e) {
    $pdo->rollBack();
    exit('✗ Importação falhou (nada foi gravado): ' . $e->getMessage() . "\n");
}
