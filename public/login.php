<?php
// POST /login.php — valida credenciais (com limite de tentativas por IP) e
// cria a sessão; GET mostra o formulário.

require __DIR__ . '/../src/boot.php';
require __DIR__ . '/../src/layout.php';

// Já logado? vai direto para o app (como no proxy do app Next)
if (usuarioAtual() !== null) redirecionar('/');

$proximoBruto = $_GET['proximo'] ?? '/';
// só aceita caminhos internos (evita redirect aberto)
$proximo = str_starts_with($proximoBruto, '/') && !str_starts_with($proximoBruto, '//') ? $proximoBruto : '/';

$erro = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrfValidar();

    $segundos = loginBloqueado(ipCliente());
    if ($segundos > 0) {
        $erro = "Muitas tentativas incorretas. Tente novamente em {$segundos}s.";
    } else {
        $usuario = trim($_POST['usuario'] ?? '');
        $senha   = (string) ($_POST['senha'] ?? '');
        $sessao = autenticar($usuario, $senha);
        if ($sessao) {
            limparTentativas(ipCliente());
            session_regenerate_id(true);
            $_SESSION['usuario'] = $sessao;
            $_SESSION['csrf'] = bin2hex(random_bytes(32)); // novo token após login
            redirecionar($proximo);
        }
        registrarTentativaFalha(ipCliente());
        $erro = 'Usuário ou senha incorretos.';
    }
}

layoutTopo('Entrar');
?>
<div class="centro-login">
  <div class="login-cabecalho">
    <span class="marca-logo grande" aria-hidden="true">P</span>
    <h1>Pendências da Fábrica</h1>
    <p>Acesso restrito — informe suas credenciais</p>
  </div>

  <form method="post" action="/login.php<?= $proximo !== '/' ? '?proximo=' . urlencode($proximo) : '' ?>" class="cartao formulario-login">
    <?= campoCsrf() ?>
    <?php if ($erro): ?><p class="form-erro" role="alert"><?= e($erro) ?></p><?php endif; ?>

    <div class="campo">
      <label for="usuario">Usuário</label>
      <input id="usuario" name="usuario" autocomplete="username" placeholder="ex.: admin" required autofocus>
    </div>

    <div class="campo">
      <label for="senha">Senha</label>
      <div class="senha-campo">
        <input id="senha" name="senha" type="password" autocomplete="current-password" required>
        <button type="button" class="btn-olho" data-alterna-senha="#senha" aria-label="Mostrar senha"><?= icone('eye') ?></button>
      </div>
    </div>

    <button type="submit" class="btn btn-principal btn-largo">Entrar</button>
  </form>
</div>
<?php layoutFim();
