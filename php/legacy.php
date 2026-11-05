<?php
// Старые адреса (proorgazm.ru, прежний pro-orgazm.ru, русские адреса этого сайта) → новые английские, 301.
// Повторяет legacyRedirect из src/lib/routes.js; карта переименований — legacy-map.json (генерируется при сборке).
// Сюда .htaccess отправляет только адреса, похожие на старые; всё остальное — index.html.

declare(strict_types=1);

$map = json_decode((string) @file_get_contents(__DIR__ . '/legacy-map.json'), true) ?: [];
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = rawurldecode((string) parse_url($uri, PHP_URL_PATH));
$query = (string) parse_url($uri, PHP_URL_QUERY);

$sections = [
    ['old' => 'massazhi', 'now' => 'massages', 'slugs' => 'massages'],
    ['old' => 'massazhisty', 'now' => 'masters', 'slugs' => 'masters'],
    ['old' => 'stati', 'now' => 'blog', 'slugs' => 'articles'],
    ['old' => 'otzyvy', 'now' => 'reviews', 'slugs' => null],
    ['old' => 'kontakty', 'now' => 'contacts', 'slugs' => null],
];

function legacy_target(string $path, array $map, array $sections): ?string
{
    $parts = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
    if (!$parts) return null;
    if (count($parts) === 1 && isset($map['masters'][$parts[0]])) return '/masters/' . $map['masters'][$parts[0]];
    if (count($parts) === 1 && isset($map['articles'][$parts[0]])) return '/blog/' . $map['articles'][$parts[0]];

    foreach ($sections as $s) {
        if ($parts[0] !== $s['old'] && $parts[0] !== $s['now']) continue;
        if ($s['now'] === 'blog' && ($parts[1] ?? '') === 'p' && ctype_digit($parts[2] ?? '')) {
            $n = (int) $parts[2] + 1;
            return $n > 1 ? "/blog?page=$n" : '/blog';
        }
        $rest = ($parts[1] ?? '') === 'post' ? array_slice($parts, 2) : array_slice($parts, 1);
        $slug = $rest[0] ?? '';
        if ($slug !== '' && $s['slugs']) $slug = $map[$s['slugs']][$slug] ?? $slug;
        $next = '/' . $s['now'] . ($slug !== '' ? '/' . $slug : '');
        return $next === '/' . implode('/', $parts) ? null : $next;
    }
    return null;
}

$to = legacy_target($path, $map, $sections);
if ($to) {
    if ($query !== '' && strpos($to, '?') === false) $to .= '?' . $query;
    header('Location: ' . $to, true, 301);
    exit;
}
// Не старый адрес — отдаём приложение
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
