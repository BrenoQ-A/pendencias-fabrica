<?php
// Conexão PDO com SQLite + numeração atômica.

if (!defined('DIR_RAIZ')) exit('Acesso direto proibido');

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $arquivo = DIR_RAIZ . '/data/pendencias.db';
    if (!is_dir(dirname($arquivo))) mkdir(dirname($arquivo), 0775, true);

    $pdo = new PDO('sqlite:' . $arquivo, null, null, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    return $pdo;
}

/** id novo estilo cuid: hex aleatório, suficiente para o tamanho da base. */
function novoId(): string
{
    return bin2hex(random_bytes(12));
}

/**
 * Número novo de pendência sem colisão: UPDATE ... RETURNING é atômico no
 * SQLite (mesma estratégia do app Next). Sem a tabela Contador (migration
 * pendente), cai no comportamento antigo (maior número + 1).
 */
function proximoNumero(): int
{
    $pdo = db();
    try {
        $st = $pdo->query("UPDATE \"Contador\" SET \"valor\" = \"valor\" + 1 WHERE \"chave\" = 'Pendencia' RETURNING \"valor\"");
        $valor = $st->fetchColumn();
        if ($valor !== false && $valor !== null) return (int) $valor;
    } catch (PDOException) {
        // tabela ainda não existe — segue para o fallback
    }
    $maior = (int) $pdo->query('SELECT COALESCE(MAX("numero"), 0) FROM "Pendencia"')->fetchColumn();
    return $maior + 1;
}

/** Busca uma pendência com suas fotos e histórico (estrutura igual à API do Next). */
function pendenciaCompleta(string $id): ?array
{
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM "Pendencia" WHERE "id" = ?');
    $st->execute([$id]);
    $p = $st->fetch();
    if (!$p) return null;

    $st = $pdo->prepare('SELECT "id", "thumbUrl", "nome" FROM "Foto" WHERE "pendenciaId" = ? ORDER BY "criadoEm" ASC');
    $st->execute([$id]);
    $p['fotos'] = $st->fetchAll();

    $st = $pdo->prepare('SELECT * FROM "HistoricoItem" WHERE "pendenciaId" = ? ORDER BY "criadoEm" DESC');
    $st->execute([$id]);
    $p['historico'] = $st->fetchAll();
    return $p;
}

/** Todas as pendências (a base é pequena; filtros aplicados em memória, como no app Next). */
function pendenciasTodas(): array
{
    $pdo = db();
    $itens = $pdo->query('SELECT * FROM "Pendencia" ORDER BY "status" ASC, "dataLimite" ASC, "numero" DESC')->fetchAll();
    if (!$itens) return [];

    $ids = array_column($itens, 'id');
    $in = implode(',', array_fill(0, count($ids), '?'));
    $fotos = db()->prepare("SELECT \"id\", \"pendenciaId\", \"thumbUrl\", \"nome\" FROM \"Foto\" WHERE \"pendenciaId\" IN ($in) ORDER BY \"criadoEm\" ASC");
    $fotos->execute($ids);
    $porPendencia = [];
    foreach ($fotos->fetchAll() as $f) $porPendencia[$f['pendenciaId']][] = $f;

    foreach ($itens as &$p) $p['fotos'] = $porPendencia[$p['id']] ?? [];
    return $itens;
}

/** Filtros da barra de busca (mesma semântica do filters-bar). */
function filtrarPendencias(array $itens, string $busca, string $status, string $local, string $responsavel, string $prioridade): array
{
    $q = mb_strtolower(trim($busca), 'UTF-8');
    $saida = [];
    foreach ($itens as $p) {
        if ($status !== 'Todos') {
            if ($status === 'Atrasada') {
                if (!isAtrasada($p)) continue;
            } elseif ($p['status'] !== $status) continue;
        }
        if ($local !== 'Todos' && $p['local'] !== $local) continue;
        if ($responsavel !== 'Todos' && $p['responsavel'] !== $responsavel) continue;
        if ($prioridade !== 'Todos' && $p['prioridade'] !== $prioridade) continue;
        if ($q !== '') {
            $alvo = mb_strtolower($p['numero'] . ' ' . $p['titulo'] . ' ' . ($p['detalhe'] ?? '') . ' ' . $p['local'] . ' ' . ($p['nota'] ?? '') . ' ' . ($p['registradoPor'] ?? '') . ' ' . $p['responsavel'], 'UTF-8');
            if (!str_contains($alvo, $q)) continue;
        }
        $saida[] = $p;
    }
    return $saida;
}
