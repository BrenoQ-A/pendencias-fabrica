# Etapa 1 — perfis de acesso, nota separada e numeração segura

Este documento é o roteiro de aplicação das mudanças da etapa 1 do plano
(Login e perfis · Notas e OS). O guia de publicação geral segue no
`DEPLOY.md` — aqui estão só os passos que a etapa 1 acrescenta.

## O que muda

| Ponto | Antes | Depois |
| --- | --- | --- |
| Login | senha única do `.env` (APP_USUARIO/APP_SENHA) para todo mundo | usuários na tabela `Usuario`, com hash PBKDF2; perfil **ADMIN edita · SUPERVISOR só vê** |
| Permissões | qualquer logado criava/editava/apagava via API | mutações exigem ADMIN (`exigirEditor` em POST/PATCH/DELETE das pendências, status e fotos) |
| Numeração | `maior número + 1` — dois registros simultâneos colidem | contador atômico (`UPDATE Contador … RETURNING`); o índice único do `numero` continua como travinha |
| Nota / OS | um texto só | campos `nota`, `ordem` e `localInstalacao` separados (formato que a importação SAP vai consumir); texto antigo preservado em `notaOriginal` |
| Mudanças de esquema | `db:push --accept-data-loss` | backup do Turso + migration SQL versionada aplicada com `db:aplicar` |

A sessão continua sendo o cookie HMAC que já existia — agora com o papel
dentro do token. **Cookies antigos deixam de valer no deploy** (não têm
papel): todo mundo faz login de novo, uma vez.

## Ordem de aplicação (produção)

```bash
# 1. Backup do Turso (não mexa no esquema sem cópia)
./scripts/backup-turso.sh <nome-do-banco>

# 2. Aplicar a migration (aditiva: cria Usuario e Contador, acrescenta 3 colunas)
bun run db:aplicar

# 3. Criar os usuários reais (a partir daí o par do .env deixa de valer)
bun run usuario:criar -- --login breno --senha 'S3nh4F0rte!' --nome 'Breno' --papel ADMIN
bun run usuario:criar -- --login <supervisora> --senha '...' --nome '...' --papel SUPERVISOR

# 4. Separar o texto antigo da nota (dois passos: teste antes de gravar)
bun run nota:backfill            # modo teste: mostra amostra, não grava
bun run nota:backfill -- --aplicar

# 5. Publicar o código (git pull + build conforme DEPLOY.md §4)
```

Se o passo 2 rodar antes do deploy do código, o app antigo continua
funcionando: a migration é só aditiva e o código novo é quem usa as
colunas/tabelas novas.

## Fallback do login de emergência

Enquanto `Usuario` estiver vazia, o par `APP_USUARIO`/`APP_SENHA` do `.env`
entra como ADMIN — é o caminho caso a migration ainda não tenha rodado ou o
banco seja recriado. Com qualquer usuário cadastrado, o fallback desliga.

Perdeu a senha do ADMIN? Rode `usuario:criar` de novo com o mesmo login para
redefinir (senha e papel).

## Testes antes de trocar o endereço no ar

1. Anônimo: qualquer página cai em `/login`; `curl` numa API devolve 401.
2. Login ADMIN: tudo acessível; criar pendência segue a numeração do contador.
3. Login SUPERVISOR: vê tudo, mas sem botões de editar/excluir/status;
   tentativa direta de POST/PATCH/DELETE na API devolve 403.
4. Detalhe de uma pendência: Nota, Ordem (OS) e Local de instalação em campos
   separados; CSV exporta as três colunas.
5. Criar duas pendências em sequência rápida: números não colidem.
6. `zcat backups/turso-*.gz | head -5`: backup íntegro.

## Notas técnicas

- **Hash de senha**: `pbkdf2$<iterações>$<sal hex>$<chave hex>`, PBKDF2-SHA256
  600k iterações (Web Crypto — funciona no proxy e nas rotas). Formato
  auto-descritivo: subir as iterações no futuro não quebra hash antigo.
- **Contador**: `UPDATE "Contador" SET valor = valor + 1 WHERE chave = 'Pendencia' RETURNING valor`
  é atômico no SQLite/libSQL. Se a tabela ainda não existir, `proximoNumero()`
  cai no comportamento antigo (maior número + 1) com aviso no log.
- **`prisma db push`** perdeu o `--accept-data-loss`: se um push reclamar de
  perda de dados, o caminho certo é gerar uma migration
  (`bun run db:migrate`) e aplicar com `bun run db:aplicar`, nunca forçar.
- **Backfill da nota**: linhas sem `/` ficam como estão (já são só nota);
  as fora do padrão aparecem na lista "para revisar à mão" — ajuste o
  `PADRAO` no `scripts/backfill-nota.mjs` se o formato real for outro.
