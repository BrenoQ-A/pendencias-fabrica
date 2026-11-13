<?php
// Utilidades compartilhadas pelas páginas (escape, datas, ícones, flash).

/** Escape para HTML — usar em TODA saída dinâmica. */
function e(?string $v): string
{
    return htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8');
}

/** Data ISO (do banco) → dd/mm/aaaa — por manipulação de string, imune a fuso. */
function formatarData(?string $iso): string
{
    if (!$iso) return '—';
    $d = substr($iso, 0, 10);
    if (strlen($d) < 10) return '—';
    [$a, $m, $dia] = explode('-', $d);
    return "$dia/$m/$a";
}

/** Hoje em YYYY-MM-DD (fuso do servidor). */
function hojeISO(): string
{
    return date('Y-m-d');
}

/** Atrasada: dataLimite < hoje && status != Concluído (mesma regra do app Next). */
function isAtrasada(array $p): bool
{
    if (empty($p['dataLimite']) || $p['status'] === 'Concluído') return false;
    return substr($p['dataLimite'], 0, 10) < hojeISO();
}

/** Dias em atraso (positivo = dias vencidos). */
function diasAtraso(array $p): int
{
    if (!isAtrasada($p)) return 0;
    $limite = new DateTime(substr($p['dataLimite'], 0, 10));
    $hoje = new DateTime(hojeISO());
    return (int) $hoje->diff($limite)->days;
}

/** Rótulo do prazo: "em X dias" / "vence hoje" / "X dias em atraso". */
function rotuloPrazo(array $p): array
{
    if (empty($p['dataLimite']) || $p['status'] === 'Concluído') return ['texto' => '', 'atrasada' => false];
    $dias = (int) round((strtotime(substr($p['dataLimite'], 0, 10)) - strtotime(hojeISO())) / 86400);
    if ($dias < 0) return ['texto' => abs($dias) . ($dias === -1 ? ' dia em atraso' : ' dias em atraso'), 'atrasada' => true];
    if ($dias === 0) return ['texto' => 'vence hoje', 'atrasada' => false];
    return ['texto' => 'em ' . $dias . ($dias === 1 ? ' dia' : ' dias'), 'atrasada' => false];
}

const CLASSE_STATUS = [
    'Pendente'     => 'st-pendente',
    'Em andamento' => 'st-andamento',
    'Concluído'    => 'st-concluido',
];

const CLASSE_PRIORIDADE = [
    'Crítico'  => 'pr-critico',
    'Alto'     => 'pr-alto',
    'Moderado' => 'pr-moderado',
    'Baixo'    => 'pr-baixo',
];

/** Ícones inline (SVG) — sem dependências externas. */
function icone(string $nome, string $classe = 'ic'): string
{
    $paths = [
        'plus'        => '<path d="M5 12h14"/><path d="M12 5v14"/>',
        'search'      => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        'filter'      => '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
        'x'           => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        'images'      => '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m5 19 4-4 3 3 4-4 3 3"/>',
        'image-off'   => '<path d="M3 3l18 18"/><rect x="3" y="5" width="18" height="14" rx="2"/>',
        'log-out'     => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
        'pencil'      => '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
        'trash'       => '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        'map-pin'     => '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        'check'       => '<path d="M20 6 9 17l-5-5"/>',
        'clock'       => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'refresh'     => '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
        'download'    => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
        'grid'        => '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>',
        'list'        => '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
        'camera'      => '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
        'moon'        => '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        'sun'         => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        'user'        => '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'receipt'     => '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/>',
        'hash'        => '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
        'building'    => '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
        'briefcase'   => '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
        'clipboard'   => '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
        'history'     => '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        'eye'         => '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
        'eye-off'     => '<path d="m2 2 20 20"/><path d="M6.7 6.7A10.6 10.6 0 0 0 2 12s3 7 10 7a10.6 10.6 0 0 0 5.3-1.3"/><path d="M9.9 4.2A11 11 0 0 1 12 4c7 0 10 7 10 7a12 12 0 0 1-1.7 2.6"/>',
        'alert'       => '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    ];
    $svg = $paths[$nome] ?? '';
    return '<svg class="' . e($classe) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $svg . '</svg>';
}

/** Flash message: guarda na sessão, mostra uma vez. */
function flash(string $tipo, string $mensagem): void
{
    $_SESSION['flash'][] = ['tipo' => $tipo, 'msg' => $mensagem];
}

/** Consome e devolve os flashes pendentes. */
function flashConsumir(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

/** Redirect + encerra a requisição (padrão POST-redirect-GET). */
function redirecionar(string $url): never
{
    header('Location: ' . $url, true, 303);
    exit;
}
