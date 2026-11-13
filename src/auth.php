<?php
// Autenticação: usuários na tabela Usuario com PBKDF2-SHA256, sessão PHP e CSRF.
//
// O formato do hash é o MESMO do app Next (src/lib/auth.ts):
//   "pbkdf2$<iterações>$<sal hex>$<chave hex>"
// então usuários criados pelo app Next (scripts/criar-usuario.mjs) entram
// aqui sem redefinir senha — e vice-versa.
//
// Fallback de emergência: enquanto Usuario estiver vazia (ou sem migration),
// vale o par APP_USUARIO/APP_SENHA do .env como ADMIN.

if (!defined('DIR_RAIZ')) exit('Acesso direto proibido');

const PBKDF2_ITERACOES = 600000;

function criarHashSenha(string $senha): string
{
    $sal = random_bytes(16);
    // ATENÇÃO: $length do hash_pbkdf2 conta em bytes quando binary=true
    // (32 bytes → 64 hex, igual ao deriveBits(256) do WebCrypto no app Next)
    $chave = bin2hex(hash_pbkdf2('sha256', $senha, $sal, PBKDF2_ITERACOES, 32, true));
    return 'pbkdf2$' . PBKDF2_ITERACOES . '$' . bin2hex($sal) . '$' . $chave;
}

function conferirHash(string $senha, string $armazenado): bool
{
    $partes = explode('$', $armazenado);
    if (count($partes) !== 4 || $partes[0] !== 'pbkdf2') return false;
    $iteracoes = (int) $partes[1];
    if ($iteracoes < 1 || $iteracoes > 10000000) return false;
    $sal = @hex2bin($partes[2]);
    if ($sal === false || $sal === '') return false;
    $calculada = bin2hex(hash_pbkdf2('sha256', $senha, $sal, $iteracoes, 32, true));
    return hash_equals($partes[3], $calculada);
}

/** Login: banco primeiro; fallback do .env só com a tabela vazia/ausente. */
function autenticar(string $login, string $senha): ?array
{
    $loginNorm = mb_strtolower(trim($login), 'UTF-8');
    if ($loginNorm === '' || $senha === '') return null;

    try {
        $st = db()->prepare('SELECT * FROM "Usuario" WHERE "login" = ?');
        $st->execute([$loginNorm]);
        $usuario = $st->fetch();
        if ($usuario) {
            if (!conferirHash($senha, $usuario['senhaHash'])) return null;
            return [
                'login' => $usuario['login'],
                'nome'  => trim((string) $usuario['nome']) !== '' ? $usuario['nome'] : $usuario['login'],
                'papel' => $usuario['papel'] === 'ADMIN' ? 'ADMIN' : 'SUPERVISOR',
            ];
        }
        // sem usuário com esse login: se já existe qualquer usuário, nega
        $total = (int) db()->query('SELECT COUNT(*) FROM "Usuario"')->fetchColumn();
        if ($total > 0) return null;
    } catch (PDOException) {
        // tabela ainda não existe (migration pendente) → fallback liberado
    }

    // Fallback de emergência (.env), como ADMIN
    $usuarioEnv = trim(getenv('APP_USUARIO') ?: 'admin');
    $senhaEnv   = getenv('APP_SENHA') ?: 'fabrica2026';
    if (!hash_equals(mb_strtolower($usuarioEnv, 'UTF-8'), $loginNorm) || !hash_equals($senhaEnv, $senha)) return null;
    return ['login' => $loginNorm, 'nome' => $loginNorm, 'papel' => 'ADMIN'];
}

/** Usuário logado na sessão (null se não há). */
function usuarioAtual(): ?array
{
    return $_SESSION['usuario'] ?? null;
}

/** true se pode editar/criar/excluir (ADMIN). */
function podeEditar(): bool
{
    return (usuarioAtual()['papel'] ?? '') === 'ADMIN';
}

/** Páginas: exige sessão ou manda para o login preservando o destino. */
function exigirLogin(): void
{
    if (usuarioAtual() !== null) return;
    $destino = $_SERVER['REQUEST_URI'] ?? '/';
    if ($destino !== '/' && str_starts_with($destino, '/')) {
        redirecionar('/login.php?proximo=' . urlencode($destino));
    }
    redirecionar('/login.php');
}

/** Páginas de mutação: exige ADMIN; supervisor ganha flash e volta. */
function exigirAdmin(): void
{
    exigirLogin();
    if (podeEditar()) return;
    flash('erro', 'Seu perfil só consulta; a edição é para o administrador.');
    redirecionar($_SERVER['HTTP_REFERER'] ?? '/');
}

/** ===== CSRF ===== */

function csrfToken(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function campoCsrf(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrfToken()) . '">';
}

/** Valida o token de POST (campo ou header). Termina a requisição se inválido. */
function csrfValidar(): void
{
    $enviado = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($enviado) || $enviado === '' || !hash_equals(csrfToken(), $enviado)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['erro' => 'Sessão expirada — recarregue a página e tente de novo.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/** ===== Limite de tentativas de login (arquivo data/tentativas.json, como o do app Next) ===== */

function registrarTentativaFalha(string $ip): void
{
    $caminho = DIR_RAIZ . '/data/tentativas.json';
    $arq = fopen($caminho, 'c+');
    if (!$arq) return;
    flock($arq, LOCK_EX);
    $bruto = stream_get_contents($arq);
    $dados = $bruto ? (json_decode($bruto, true) ?: []) : [];

    $agora = time();
    $r = $dados[$ip] ?? ['n' => 0, 'ate' => 0];
    if ($agora >= $r['ate']) $r['n'] = 0;
    $r['n']++;
    $r['ate'] = $agora + 180; // janela de 3 minutos
    $dados[$ip] = $r;

    ftruncate($arq, 0);
    rewind($arq);
    fwrite($arq, json_encode($dados));
    flock($arq, LOCK_UN);
    fclose($arq);
}

function loginBloqueado(string $ip): int
{
    $caminho = DIR_RAIZ . '/data/tentativas.json';
    if (!is_file($caminho)) return 0;
    $bruto = @file_get_contents($caminho);
    $dados = $bruto ? (json_decode($bruto, true) ?: []) : [];
    $r = $dados[$ip] ?? null;
    if ($r && $r['n'] >= 5 && time() < $r['ate']) return max(1, $r['ate'] - time());
    return 0;
}

function limparTentativas(string $ip): void
{
    $caminho = DIR_RAIZ . '/data/tentativas.json';
    if (!is_file($caminho)) return;
    $bruto = @file_get_contents($caminho);
    $dados = $bruto ? (json_decode($bruto, true) ?: []) : [];
    unset($dados[$ip]);
    @file_put_contents($caminho, json_encode($dados));
}

function ipCliente(): string
{
    $encaminhado = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0]);
    return $encaminhado !== '' ? $encaminhado : ($_SERVER['REMOTE_ADDR'] ?? 'desconhecido');
}
