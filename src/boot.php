<?php
// Bootstrap de TODAS as páginas: sessão segura + carregamento das dependências.

declare(strict_types=1);

define('DIR_RAIZ', dirname(__DIR__)); // php/

require DIR_RAIZ . '/src/helpers.php';
require DIR_RAIZ . '/src/db.php';
require DIR_RAIZ . '/src/auth.php';

// Sessão: cookie HttpOnly + SameSite=Lax; Secure atrás de HTTPS (Caddy/PHP-FPM
// enviam x-forwarded-proto). Duração: SESSAO_DIAS (padrão 7, como no app Next).
if (session_status() !== PHP_SESSION_ACTIVE) {
    $dias = (int) (getenv('SESSAO_DIAS') ?: 7);
    if ($dias < 1) $dias = 1;
    $https = strtolower(explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')[0]) === 'https'
        || (($_SERVER['HTTPS'] ?? '') === 'on');

    session_set_cookie_params([
        'lifetime' => $dias * 86400,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('pendencias_sessao');
    session_start();
}
