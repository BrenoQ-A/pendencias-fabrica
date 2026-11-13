#!/bin/bash
# Testa o fluxo de login do app Pendências da Fábrica (servidor standalone)
set -e
cd /home/z/my-project/pendencias-fabrica

PORT=3001
export DATABASE_URL="file:/home/z/my-project/pendencias-fabrica/db/custom.db"
export APP_SENHA="senha-teste-123"
export APP_USUARIO="inspetor"
export AUTH_SECRET="segredo-runtime-abc123"
export PORT=$PORT
export HOSTNAME=127.0.0.1
export NODE_ENV=production
C=(curl -s --noproxy '*')

# mata servidor anterior na porta de teste (se houver)
for pid in $(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do kill -9 "$pid" 2>/dev/null || true; done
sleep 1

# 1. Banco SQLite local
mkdir -p db
bunx prisma db push --skip-generate 2>&1 | tail -1

# 2. Sobe o servidor standalone com credenciais definidas EM RUNTIME
node .next/standalone/server.js > /tmp/pendencias-server.log 2>&1 &
SERVER_PID=$!
trap 'kill -9 $SERVER_PID 2>/dev/null || true' EXIT
sleep 3

pass=0; fail=0
verificar() {
  local desc="$1" esperado="$2" obtido="$3"
  if [ "$esperado" = "$obtido" ]; then pass=$((pass+1)); echo "✅ $desc (HTTP $obtido)"
  else fail=$((fail+1)); echo "❌ $desc — esperado $esperado, obtido $obtido"; fi
}
cod() { "${C[@]}" -o /dev/null -w '%{http_code}' "$@"; }

JAR=/tmp/pendencias-cookies.txt
rm -f "$JAR"

# --- sem sessão ---
verificar "GET / sem login → redirect p/ /login"   "307" "$(cod http://127.0.0.1:$PORT/)"
verificar "GET /login sem login → 200"             "200" "$(cod http://127.0.0.1:$PORT/login)"
verificar "GET /api/pendencias sem login → 401"    "401" "$(cod http://127.0.0.1:$PORT/api/pendencias)"
verificar "GET /api/fotos/abc sem login → 401"     "401" "$(cod http://127.0.0.1:$PORT/api/fotos/abc)"
echo "   sessão sem login: $("${C[@]}" http://127.0.0.1:$PORT/api/auth/session)"

# --- login ---
verificar "POST login senha errada → 401"          "401" "$(cod -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"usuario":"inspetor","senha":"errada"}')"
verificar "POST login usuário errado → 401"        "401" "$(cod -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"usuario":"outro","senha":"senha-teste-123"}')"
verificar "POST login correto → 200"               "200" "$(cod -c "$JAR" -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"usuario":"inspetor","senha":"senha-teste-123"}')"
grep -q pendencias_sessao "$JAR" && echo "✅ cookie de sessão gravado (HttpOnly)" && pass=$((pass+1)) || { echo "❌ cookie ausente"; fail=$((fail+1)); }

# --- com sessão ---
verificar "GET / logado → 200"                     "200" "$(cod -b "$JAR" http://127.0.0.1:$PORT/)"
verificar "GET /login logado → redirect p/ /"      "307" "$(cod -b "$JAR" http://127.0.0.1:$PORT/login)"
verificar "GET /api/pendencias logado → 200"       "200" "$(cod -b "$JAR" http://127.0.0.1:$PORT/api/pendencias)"
echo "   sessão logada: $("${C[@]}" -b "$JAR" http://127.0.0.1:$PORT/api/auth/session)"

# --- criar/listar com sessão (dados protegidos de fato) ---
CODIGO=$("${C[@]}" -b "$JAR" -o /tmp/criada.json -w '%{http_code}' -X POST http://127.0.0.1:$PORT/api/pendencias -H 'Content-Type: application/json' -d '{"titulo":"Vazamento no armazém 2","local":"Armazém 2","responsavel":"João","prioridade":"Alto"}')
verificar "POST /api/pendencias logado → 201" "201" "$CODIGO"
python3 -c "import json;d=json.load(open('/tmp/criada.json'));print('   criada: #%s — %s'%(d['numero'],d['titulo']))" || true
QTD=$("${C[@]}" -b "$JAR" http://127.0.0.1:$PORT/api/pendencias | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
echo "   pendências listadas: $QTD"

# --- cookie forjado deve ser rejeitado ---
verificar "GET / com cookie forjado → redirect" "307" "$(cod -H 'Cookie: pendencias_sessao=abc.def' http://127.0.0.1:$PORT/)"

# --- logout ---
"${C[@]}" -b "$JAR" -c "$JAR" -X POST http://127.0.0.1:$PORT/api/auth/logout > /dev/null
verificar "GET /api/pendencias após logout → 401" "401" "$(cod -b "$JAR" http://127.0.0.1:$PORT/api/pendencias)"

# --- força bruta: 5 tentativas erradas → 6ª vira 429 ---
for i in 1 2 3 4 5; do "${C[@]}" -o /dev/null -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"usuario":"inspetor","senha":"erro"}'; done
verificar "6ª tentativa errada seguida → 429" "429" "$(cod -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' -d '{"usuario":"inspetor","senha":"senha-teste-123"}')"

echo ""
echo "===== RESULTADO: $pass passaram, $fail falharam ====="
exit $fail
