"""Teste E2E da API contra o Turso: criar com fotos, status, buscar foto, excluir (cascade).
Uso: python3 scripts/teste_api_turso.py  (servidor dev já deve estar no ar na porta 3000)
"""
import json, base64, sys, urllib.request

BASE = 'http://localhost:3000'

def req(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=60) as resp:
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw.strip() else None)

falhas = []

def check(nome, ok, detalhe=''):
    print(f"{'✓' if ok else '✗'} {nome}{(' — ' + detalhe) if detalhe else ''}")
    if not ok:
        falhas.append(nome)

# 1. GET lista (o marcador TESTE-MARKER-TURSO foi inserido direto no Turso antes)
st, lista = req('/api/pendencias')
marker = next((p for p in lista if p['titulo'] == 'TESTE-MARKER-TURSO'), None)
check('GET lista', st == 200 and len(lista) == 39, f'{len(lista)} registros (38 + marcador)')
check('app lendo o Turso', marker is not None)

# 2. POST criar com 2 fotos (uma ~260 KB simulando foto real comprimida)
big = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xff\xe0' + b'x' * 260000).decode()
small = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xff\xe0pequena').decode()
st, criada = req('/api/pendencias', 'POST', {
    'titulo': 'TESTE-API-TURSO', 'local': 'Teste', 'responsavel': 'Teste',
    'prioridade': 'Baixo', 'status': 'Pendente', 'registradoPor': 'Teste automático',
    'fotos': [
        {'dataUrl': big, 'thumbUrl': small, 'nome': 'grande.jpg'},
        {'dataUrl': small, 'thumbUrl': small, 'nome': 'pequena.jpg'},
    ],
})
pid = criada['id']
check('POST criar (foto grande no TEXT do Turso)', st in (200, 201) and len(criada['fotos']) == 2,
      f"nº {criada['numero']}")

# 3. POST status com comentário (histórico)
st, atual = req(f'/api/pendencias/{pid}/status', 'POST',
                {'status': 'Em andamento', 'comentario': 'teste automático Turso', 'autor': 'Teste'})
check('POST status + histórico', st == 200 and atual['status'] == 'Em andamento'
      and len(atual['historico']) >= 2)

# 4. GET foto em tamanho cheio (caminho do lightbox)
fid = criada['fotos'][0]['id']
st, foto = req(f'/api/fotos/{fid}')
dataurl = foto.get('dataUrl', '') if isinstance(foto, dict) else str(foto)
check('GET foto full (lightbox)', st == 200 and len(dataurl) > 200000,
      f'{len(dataurl) // 1024} KB')

# 5. DELETE da pendência (cascade de fotos + histórico no banco)
st, _ = req(f'/api/pendencias/{pid}', 'DELETE')
check('DELETE pendência', st == 200)

# 6. DELETE do marcador
check('DELETE marcador', marker is not None and req(f"/api/pendencias/{marker['id']}", 'DELETE')[0] == 200)

# 7. Estado final
st, final = req('/api/pendencias')
limpo = all(p['titulo'] not in ('TESTE-MARKER-TURSO', 'TESTE-API-TURSO') for p in final)
check('estado final 38 registros', len(final) == 38 and limpo, f'{len(final)} registros')

print(f"\n{'🎉 TODOS OS TESTES PASSARAM' if not falhas else '⚠️ FALHAS: ' + ', '.join(falhas)}")
sys.exit(1 if falhas else 0)
