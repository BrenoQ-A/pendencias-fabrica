<?php
// Cria um usuário do app (ou reseta a senha/papel de um que já existe).
// Uso: php cli/criar-usuario.php --login breno --senha 'S3nh4F0rte!' --nome 'Breno' --papel ADMIN
// Papéis: ADMIN edita · SUPERVISOR só vê.
//
// O hash segue o MESMO formato do app Next (pbkdf2$<iterações>$<sal hex>$<chave hex>),
// então um usuário criado aqui também funciona no app Next, e vice-versa.

if (PHP_SAPI !== 'cli') exit('Somente via CLI');
define('DIR_RAIZ', dirname(__DIR__));
require DIR_RAIZ . '/src/db.php';
require DIR_RAIZ . '/src/auth.php';

$pega = function (string $nome) use ($argv): ?string {
    $i = array_search($nome, $argv, true);
    return $i !== false && isset($argv[$i + 1]) ? $argv[$i + 1] : null;
};

$login = mb_strtolower(trim($pega('--login') ?? ''), 'UTF-8');
$senha = $pega('--senha') ?? '';
$nome  = $pega('--nome');
$papel = strtoupper($pega('--papel') ?? 'ADMIN');

if ($login === '' || $senha === '') {
    echo "Uso: php cli/criar-usuario.php --login <login> --senha <senha> [--nome <nome>] [--papel ADMIN|SUPERVISOR]\n";
    exit(1);
}
if (!in_array($papel, ['ADMIN', 'SUPERVISOR'], true)) {
    echo "Papel inválido: use ADMIN ou SUPERVISOR.\n";
    exit(1);
}

$senhaHash = criarHashSenha($senha);
$st = db()->prepare('SELECT "id" FROM "Usuario" WHERE "login" = ?');
$st->execute([$login]);
$existente = $st->fetchColumn();

if ($existente) {
    db()->prepare('UPDATE "Usuario" SET "senhaHash" = ?, "papel" = ?, "nome" = COALESCE(?, "nome") WHERE "login" = ?')
        ->execute([$senhaHash, $papel, $nome, $login]);
    echo "OK: $login atualizado com papel $papel (senha redefinida).\n";
} else {
    db()->prepare('INSERT INTO "Usuario" ("id","login","nome","papel","senhaHash","criadoEm") VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)')
        ->execute([bin2hex(random_bytes(12)), $login, $nome, $papel, $senhaHash]);
    echo "OK: $login criado com papel $papel.\n";
}
