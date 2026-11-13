# Guia de publicação — Pendências da Fábrica

Passo a passo para colocar o app no ar, fazer backup e atualizar.
Tempo estimado da primeira publicação: **30–45 minutos**.

---

## 1. Visão geral da arquitetura de publicação

```
Celular dos inspetores (4G/Wi-Fi)
        │  HTTPS
        ▼
┌──────────────────────────────────────┐
│  VPS (Ubuntu + Docker)               │
│  ┌────────────┐   ┌───────────────┐  │
│  │ Caddy      │──▶│ App Next.js   │  │
│  │ (HTTPS     │   │ (container)   │  │
│  │  automático│   └──────┬────────┘  │
│  │  + domínio)│          │           │
│  └────────────┘          ▼           │
│              ┌─────────────────────┐ │
│              │ Volume Docker /data │ │
│              │ SQLite + fotos      │ │
│              │ (base64)            │ │
│              └─────────────────────┘ │
└──────────────────────────────────────┘
        │  cron diário (22h)
        ▼
   Backups no host (/var/backups/pendencias)
```

- **Um único container** roda a aplicação. O banco SQLite e as fotos ficam
  no volume `pendencias-data` (montado em `/data`), que sobrevive a
  reinicializações e atualizações do container.
- **Caddy** fornece HTTPS automático (certificado Let's Encrypt, renovado
  sozinho) e redireciona o tráfego para o app.
- **Backup diário** via `scripts/backup.sh` agendado no cron do host.

---

## 2. Requisitos

| Item | Mínimo | Observação |
|---|---|---|
| VPS | 1 vCPU / 1 GB RAM / 10 GB disco | Hostinger KVM1, Contabo, DigitalOcean, etc. |
| Sistema | Ubuntu 24.04 LTS | qualquer distro com Docker serve |
| Domínio | 1 subdomínio, ex.: `pendencias.suaempresa.com.br` | registro "A" apontando para o IP da VPS |
| Docker | Engine + plugin compose | instalado no passo 3 |

---

## 3. Passo a passo na VPS

### 3.1 Preparar o servidor (uma vez)

```bash
# entrar como root (ou usar sudo nos comandos abaixo)
ssh root@IP_DA_VPS

# atualizar e instalar Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# criar diretório do projeto e de backups
mkdir -p /opt/pendencias /var/backups/pendencias
```

### 3.2 Enviar o projeto

Do seu computador, copie a pasta do projeto para a VPS:

```bash
rsync -avz --exclude node_modules --exclude .next --exclude db \
  /caminho/do/projeto/ root@IP_DA_VPS:/opt/pendencias/
```

### 3.3 Subir o app

```bash
cd /opt/pendencias
docker compose up -d --build      # constrói a imagem e sobe o container

docker compose logs -f app        # veja o log até "Ready" (Ctrl+C para sair)
```

O banco SQLite é criado automaticamente no primeiro boot
(entrada do app em `http://IP_DA_VPS:3000`).

### 3.4 Configurar o login de acesso

O app só abre depois do login (as pendências, fotos e histórico ficam
protegidos — inclusive as APIs). As credenciais são definidas por variáveis
de ambiente no `docker-compose.yml`:

| Variável | Padrão | Para quê |
|---|---|---|
| `APP_USUARIO` | `admin` | nome de usuário na tela de login |
| `APP_SENHA` | `fabrica2026` | senha de acesso — **troque antes de publicar** |
| `AUTH_SECRET` | *(padrão interno)* | segredo que assina o cookie de sessão |
| `SESSAO_DIAS` | `7` | quantos dias o login dura sem repetir a senha |

Para definir seus valores, crie um arquivo `.env` ao lado do
`docker-compose.yml` (o compose lê automaticamente):

```bash
cd /opt/pendencias
cat > .env <<'EOF'
APP_USUARIO=admin
APP_SENHA=uma-senha-forte-da-equipe
AUTH_SECRET=TROQUE_POR_UM_VALOR_ALEATORIO
EOF

# gere o AUTH_SECRET com:
openssl rand -hex 32

docker compose up -d   # recria o container aplicando o novo .env
```

> Como funciona: a sessão é um cookie `HttpOnly` assinado com HMAC-SHA256
> e expira em `SESSAO_DIAS` dias. Depois de trocar `APP_SENHA`, os
> usuários já logados continuam na sessão até ela expirar (ou até você
> reiniciar com um `AUTH_SECRET` novo, que desloga todos). Tentativas de
> login erradas são limitadas a 5 a cada 3 minutos por IP.
> O usuário/senha podem ser compartilhados pela equipe — é um acesso único,
> simples e adequado para uso interno.

### 3.5 Habilitar HTTPS (opcional, recomendado)

1. No provedor de DNS, crie o registro **A**: `pendencias.suaempresa.com.br` → IP da VPS.
2. Na VPS:

```bash
cd /opt/pendencias
cp Caddyfile.prod.example Caddyfile.prod
nano Caddyfile.prod               # troque pelo seu domínio
nano docker-compose.yml           # descomente o serviço "caddy" e os volumes
docker compose up -d              # sobe o Caddy
```

O Caddy emite e renova o certificado HTTPS sozinho. A partir daí, use
somente `https://pendencias.suaempresa.com.br`.

### 3.6 Agendar backup diário

```bash
crontab -e
# adicionar a linha (backup às 22h, mantém os 30 mais recentes):
0 22 * * * /opt/pendencias/scripts/backup.sh /var/backups/pendencias
```

Para copiar os backups para fora do servidor (recomendado), adicione
também um `rsync`/`rclone` para um HD externo ou storage em nuvem —
exemplo semanal:

```cron
0 23 * * 5 rsync -az /var/backups/pendencias/ usuario@outra-maquina:/backups/pendencias/
```

---

## 4. Operação do dia a dia

| Tarefa | Comando |
|---|---|
| Ver logs | `docker compose logs -f app` |
| Reiniciar | `docker compose restart app` |
| Status | `docker compose ps` |
| Backup manual | `./scripts/backup.sh` |
| Restaurar backup | pare o app, copie o `.db` para o volume e suba (ver §6) |

### Atualizar o app (nova versão)

```bash
cd /opt/pendencias
rsync -avz --exclude node_modules --exclude .next --exclude db \
  /caminho/do/projeto/ root@IP_DA_VPS:/opt/pendencias/   # do seu PC
docker compose up -d --build
```

Os dados (SQLite + fotos) ficam no volume — nada é perdido no rebuild.

---

## 5. Importar a planilha original (opcional)

Os 38 registros da planilha podem ser recarregados num banco novo:

```bash
cd /opt/pendencias
docker compose exec app node --experimental-strip-types scripts/seed.ts
```

> Os arquivos `scripts/seed.ts` e `scripts/seed_data.json` já vão dentro
> da imagem. Importar mais de uma vez duplica os registros — rode só
> uma vez, em banco recém-criado.

---

## 6. Restaurar um backup

```bash
cd /opt/pendencias
docker compose stop app
docker run --rm -v pendencias_pendencias-data:/data -v /var/backups/pendencias:/bk \
  alpine cp /bk/pendencias-AAAAMMDD-HHMMSS.db /data/custom.db
docker compose start app
```

> O nome do volume pode variar (`docker volume ls` para confirmar).

---

## 7. Checklist de segurança

- [ ] `APP_SENHA` trocada do padrão (`fabrica2026`) e `AUTH_SECRET` definido com `openssl rand -hex 32`
- [ ] SSH só com chave (desabilitar senha: `PasswordAuthentication no`)
- [ ] Firewall: liberar apenas 22, 80 e 443 (`ufw allow 22,80,443/tcp`)
- [ ] Acessar sempre pelo domínio com HTTPS (com o Caddy ativo, fechar a porta 3000 externa removendo `ports: "3000:3000"` e usando `expose`)
- [ ] Backup diário agendado + cópia fora do servidor
- [ ] `docker compose pull && docker compose up -d --build` mensal (atualizações de segurança)

---

## 8. Alternativas de hospedagem (resumo)

| Opção | Custo/mês | Vantagem | Desvantagem |
|---|---|---|---|
| **VPS + Docker (recomendada)** | R$ 15–30 | acesso de qualquer lugar, HTTPS grátis, dados num volume fácil de backup, sem limites de uso | você administra o servidor (≈1 h/mês) |
| Servidor/mini PC na fábrica | R$ 0 | dados 100% internos | exige rede com IP fixo/regra de acesso externo; queda de energia/fibra para o acesso remoto |
| Vercel + Turso/Neon | R$ 0 (tier free) | deploy em 1 clique, sem servidor | exige migrar SQLite+base64 para banco em nuvem (refactor de armazenamento); fotos limitadas pelo plano |
| Railway/Fly.io | US$ 5+ | PaaS com volume persistente | cobrança em dólar; menor previsibilidade de custo |
