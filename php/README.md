# Pendências da Fábrica — versão PHP

Refatoração do app (Next.js/React/TypeScript) para **PHP + HTML + CSS + JavaScript**
sem framework e sem build: páginas renderizadas no servidor, SQLite local via PDO,
um CSS e um JS (sem dependências externas).

## Por que esta pasta não mexe no app atual

A pasta `php/` é autônoma e **convive** com o app Next: mesmo schema de banco,
mesmos nomes de tabelas/colunas e **hashes de senha compatíveis** (formato
`pbkdf2$<iterações>$<sal hex>$<chave hex>` em ambos). O app Next continua
funcionando; a troca de tráfego acontece quando você apontar o Caddy/nginx para
a versão PHP.

## Requisitos

- PHP 8.1+ com extensões `pdo_sqlite` e `mbstring` (padrão em quase toda hospedagem PHP)
- Nada mais — sem composer, sem npm, sem build

## Instalar e rodar

```bash
cd php
php cli/migrar.php                                  # cria data/pendencias.db
php cli/criar-usuario.php --login breno --senha 'S3nh4F0rte!' --nome 'Breno' --papel ADMIN
php cli/criar-usuario.php --login maria --senha '...' --nome 'Maria' --papel SUPERVISOR

# desenvolvimento / teste rápido:
php -S 0.0.0.0:8090 -t public                       # abre em http://localhost:8090
```

Em produção atrás do Caddy (`Caddyfile` do projeto), aponte para o docroot:

```
pendencias.seudominio.com {
    root * /caminho/do/projeto/php/public
    encode gzip
    php_fastcgi unix//run/php/php8.2-fpm.sock
    file_server
}
```

Qualquer outro servidor com PHP-FPM serve do mesmo jeito (docroot = `php/public`).

Variáveis opcionais (mesmas do app Next): `APP_USUARIO`, `APP_SENHA` (fallback
de emergência, ADMIN, só enquanto não houver usuário na tabela `Usuario`),
`SESSAO_DIAS` (padrão 7). Não há segredo de assinatura para configurar: a
sessão é gerenciada pelo próprio PHP (arquivos no servidor + cookie HttpOnly).

## Trazer os dados do Turso (pendências, fotos, histórico)

```bash
turso db shell <nome-do-banco> .dump > dump.sql
php cli/importar-dump.php dump.sql            # banco local precisa estar vazio
php cli/importar-dump.php dump.sql --sobrescrever   # ou substituir o que houver
```

Usuários: recrie com `criar-usuario.php` (ou copie as linhas de `Usuario` do
dump — os hashes são compatíveis).

## O que a versão PHP entrega (paridade com o app Next)

- Login com papéis (**ADMIN edita · SUPERVISOR só vê**), CSRF em todo POST,
  limite de 5 tentativas de login por IP/3 min, cookie de sessão HttpOnly+SameSite
- Lista com filtros (busca, status, atrasadas, local, responsável, prioridade),
  indicadores + progresso, Kanban com ações rápidas, galeria com lightbox
- Criar/editar/excluir pendências; histórico de status com comentário; contador
  de numeração atômico (`UPDATE … RETURNING`, igual ao app Next)
- Fotos comprimidas no navegador (canvas, máx. 1280px + thumb 320px — port do
  `compress.ts`), guardadas no banco; imagem completa servida por `/fotos.php?id=`
- Nota, Ordem (OS) e Local de instalação separados + `notaOriginal`
- Exportação CSV (mesmas colunas do app Next, com BOM para o Excel)

## Diferenças conhecidas (aceitáveis e documentadas)

- **Fotos exigem JavaScript** no navegador (compressão é no cliente). Sem GD no
  servidor, uma foto sem JS não é comprimida — o fluxo normal (celular/navegador
  moderno) funciona sempre.
- Sessão em arquivos PHP (padrão do runtime) em vez de token HMAC; `session_regenerate_id`
  no login, sem redirecionamento para "/login" por expiração de token — o cookie
  simplesmente expira pelo tempo.
- Sem Turso no PHP: o banco passa a ser o SQLite local (backup = copiar
  `data/pendencias.db` — agende como no `scripts/backup.sh` do projeto).

## Estrutura

```
php/
  public/        docroot — única pasta exposta ao servidor web
    index.php    lista/kanban/fotos + indicadores + filtros + CSV
    login.php    login (rate limit)  ·  logout.php
    nova.php     criar/editar (formulário único)
    pendencia.php  detalhe + histórico + ações
    fotos.php    imagem completa p/ lightbox
    api/         status.php · excluir.php · fotos.php (POST, CSRF, papel ADMIN)
    assets/      app.css · app.js (sem dependências)
  src/           boot.php · helpers.php · db.php · auth.php · layout.php
  cli/           migrar.php · criar-usuario.php · importar-dump.php
  sql/           schema.sql (mesmo schema do app Next)
  data/          pendencias.db (criado em runtime, nunca versionado)
```
