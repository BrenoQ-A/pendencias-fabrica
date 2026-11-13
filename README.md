# Pendências da Fábrica

Registro e acompanhamento de problemas das instalações da fábrica: fotos,
prazos, responsáveis e progresso das tarefas. Leve, otimizado para celular.

**Aplicação em PHP 8 + SQLite, sem framework e sem build** — páginas renderizadas
no servidor, um CSS e um JavaScript próprios (compressão de fotos, lightbox e
tema no navegador). Este projeto substituiu a versão anterior em Next.js/React:
mesmo visual e mesmos recursos, agora em uma stack simples de hospedar.

## Requisitos

- PHP 8.1+ com `pdo_sqlite` e `mbstring` (padrão em quase toda hospedagem PHP)
- Nada mais — sem composer, sem npm, sem build

## Primeiro uso

```bash
php cli/migrar.php                                                  # cria data/pendencias.db
php cli/criar-usuario.php --login breno --senha 'S3nh4F0rte!' --nome 'Breno' --papel ADMIN
php cli/criar-usuario.php --login maria --senha '...' --nome 'Maria' --papel SUPERVISOR

php -S 0.0.0.0:8090 -t public                                       # teste rápido: http://localhost:8090
```

Papéis: **ADMIN** cria/edita/exclui · **SUPERVISOR** só consulta.
Enquanto a tabela `Usuario` estiver vazia, o par `APP_USUARIO`/`APP_SENHA`
do `.env` entra como ADMIN de emergência (veja `.env.example`).

## Dados: virada do Turso e rotina de backup

O histórico de produção estava no Turso (banco remoto da versão antiga).
A migração é feita uma única vez, **antes de trocar o tráfego**:

```bash
# 1) backup de segurança (na máquina com o CLI do Turso logado):
turso db shell pendencias-fabrica .dump > backup.sql

# 2) importa no SQLite desta versão (banco precisa estar sem pendências):
php cli/importar-dump.php backup.sql                # ou: php cli/importar-dump.php backup.sql --sobrescrever
```

O importador valida, executa tudo em transação e reposiciona o contador de
numeração no maior `numero` importado. Usuários: recrie com `criar-usuario.php`
ou copie as linhas de `Usuario` do dump (os hashes de senha são compatíveis).

Rotina de backup do SQLite (snapshot consistente, rotação de 10):

```bash
php cli/backup.php                                  # → data/backups/pendencias-AAAA-MM-DD-HHMMSS.db
```

Restauração: pare o app, substitua `data/pendencias.db` pelo backup e suba de novo.

## Deploy

**Docker (recomendado)** — Caddy + PHP-FPM, banco em volume:

```bash
docker compose up -d --build
docker compose exec php php cli/migrar.php
docker compose exec php php cli/criar-usuario.php --login admin --senha '...' --papel ADMIN
```

Para produção com domínio, troque `:80` pelo domínio no `Caddyfile`
(o Caddy emite certificado TLS automaticamente).

**VPS sem Docker** — Caddy direto no servidor:

```
pendencias.suafabrica.com.br {
    root * /caminho/deste/projeto/public
    encode gzip
    php_fastcgi unix//run/php/php8.3-fpm.sock
    file_server
}
```

**Hospedagem compartilhada PHP**: aponte o docroot para `public/` e pronto —
a pasta `public/` é a única exposta ao servidor web.

Variáveis de ambiente (`.env`): `APP_USUARIO`, `APP_SENHA` (fallback de
emergência) e `SESSAO_DIAS` (padrão 7). Não há segredo de assinatura para
configurar: a sessão é do próprio PHP.

## Estrutura

```
public/          docroot — única pasta exposta ao servidor web
  index.php      lista/kanban/fotos + indicadores + filtros + CSV
  login.php      login (rate limit 5 tentativas/3 min por IP)  ·  logout.php
  nova.php       criar/editar (formulário único)
  pendencia.php  detalhe + histórico + ações
  fotos.php      imagem completa p/ lightbox
  api/           status.php · excluir.php · fotos.php (POST, CSRF, papel ADMIN)
  assets/        app.css · app.js (sem dependências)
src/             boot.php · helpers.php · db.php · auth.php · layout.php
cli/             migrar.php · criar-usuario.php · importar-dump.php · backup.php
sql/             schema.sql
data/            pendencias.db (criado em runtime, nunca versionado)
```

## Segurança

- Senhas com PBKDF2-SHA256 (600 mil iterações, sal aleatório por usuário)
- CSRF em todo POST (formulários e fetch); cookie de sessão HttpOnly + SameSite=Lax
  (+ Secure atrás de HTTPS) e `session_regenerate_id` no login
- Papel verificado no servidor em toda ação de mutação (não confia no HTML)
- Numeração sem colisão: `UPDATE Contador … RETURNING` atômico
- Fotos comprimidas no navegador (máx. 1280px + miniatura 320px) e servidas
  apenas a usuários autenticados

## Diferenças em relação à versão antiga (Next.js)

- **Fotos exigem JavaScript** no navegador: a compressão é feita no cliente
  (como antes); sem JS, fotos não podem ser anexadas.
- **Banco passa a ser o SQLite local** (`data/pendencias.db`) — backup = copiar
  um arquivo. O Turso só existe como fonte de migração (dump).
- Sessão em arquivos do PHP em vez de token HMAC — sem `AUTH_SECRET` para
  configurar.
- **Sem Vercel**: roda em VPS com Docker, Caddy/nginx + PHP-FPM ou hospedagem
  compartilhada PHP.

## Solução de problemas

- **“Não foi possível ler a imagem”**: arquivo corrompido ou navegador muito
  antigo; tente outra foto.
- **Fotos não anexam no celular**: confirme que o JavaScript está habilitado.
- **Permissão negada no banco**: `chown www-data:www-data data/` (ou equivalente
  do usuário do PHP-FPM).
- **Sessão expirando cedo**: ajuste `SESSAO_DIAS` e verifique se o disco do
  servidor não está limpando `sessions/` do PHP.
