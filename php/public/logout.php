<?php
// POST /logout.php — encerra a sessão e volta para o login.

require __DIR__ . '/../src/boot.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrfValidar();
    $_SESSION = [];
    session_destroy();
}
redirecionar('/login.php');
