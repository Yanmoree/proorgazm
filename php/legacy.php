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
// Не старый адрес — отдаём приложение, сразу с нужными title, description и canonical для поисковиков
// (та же логика, что в src/lib/seo.js; после загрузки JS теги обновляет сам сайт)
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
$html = (string) file_get_contents(__DIR__ . '/index.html');
try {
    $meta = page_meta($path);
} catch (Throwable $e) {
    error_log('[page] ' . $e->getMessage());
    $meta = null;
}
if ($meta) {
    if ($meta['status'] !== 200) http_response_code($meta['status']);
    $html = inject_meta($html, $meta);
}
echo $html;

function seo_clip(string $text, int $max = 160): string
{
    $s = trim(preg_replace('/\s+/u', ' ', preg_replace('/[#>*_`]/u', '', $text)));
    if (mb_strlen($s) <= $max) return $s;
    $cut = mb_substr($s, 0, $max - 1);
    $sp = mb_strrpos($cut, ' ');
    $cut = mb_substr($cut, 0, max($sp === false ? 0 : $sp, (int) ($max * 0.6)));
    return preg_replace('/[\s,.;:—-]+$/u', '', $cut) . '…';
}

function seo_fill(string $tpl, array $data): string
{
    $out = preg_replace_callback('/\{(\w+)\}/', function ($m) use ($data) {
        $v = $data[$m[1]] ?? '';
        return trim(preg_replace('/\s+/u', ' ', preg_replace('/[#>*_`]/u', '', is_scalar($v) ? (string) $v : '')));
    }, $tpl);
    return trim(preg_replace('/\s+/u', ' ', $out));
}

function page_meta(string $path): ?array
{
    $defaults = json_decode((string) @file_get_contents(__DIR__ . '/seo-defaults.json'), true);
    if (!$defaults) return null;
    $path = '/' . trim($path, '/');
    $parts = array_values(array_filter(explode('/', $path), 'strlen'));

    if (($parts[0] ?? '') === 'admin') return ['status' => 200, 'title' => 'Админка · ProOrgazm', 'description' => '', 'noindex' => true, 'path' => $path];

    global $CONFIG;
    $CONFIG = require __DIR__ . '/../config.php';
    require_once __DIR__ . '/api/lib.php';
    $settings = setting('site');

    $static = function (string $key, int $page = 1) use ($defaults, $settings) {
        $d = $defaults['pages'][$key];
        $own = $key === 'home' ? ($settings['seo'] ?? []) : [
            'title' => $settings['seoPages'][$key . 'Title'] ?? '',
            'description' => $settings['seoPages'][$key . 'Description'] ?? '',
        ];
        $title = trim((string) ($own['title'] ?? '')) ?: $d['title'];
        if ($page > 1) $title .= str_replace('{n}', (string) $page, $defaults['pageSuffix']);
        return ['title' => $title, 'description' => seo_clip((string) (($own['description'] ?? '') ?: $d['description']))];
    };
    $item = function (string $collection, string $slug) use ($defaults) {
        $it = get_item($collection, $slug);
        if (!$it) return null;
        $d = $defaults['items'][$collection];
        return [
            'title' => trim((string) ($it['seoTitle'] ?? '')) ?: seo_fill($d['title'], $it),
            'description' => seo_clip((string) (($it['seoDescription'] ?? '') ?: seo_fill($d['description'], $it))),
        ];
    };

    $sections = ['massages' => 'massages', 'masters' => 'masters', 'blog' => 'articles'];
    $m = null;
    if (!$parts) $m = $static('home');
    elseif (count($parts) === 1 && in_array($parts[0], ['massages', 'masters', 'reviews', 'contacts', 'privacy'], true)) $m = $static($parts[0]);
    elseif (count($parts) === 1 && $parts[0] === 'blog') {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $m = $static('blog', $page);
        $cat = trim((string) ($_GET['category'] ?? ''));
        if ($cat !== '' && $cat !== 'Все') $m['title'] = "$cat — " . $m['title'];
    } elseif (count($parts) === 2 && isset($sections[$parts[0]])) $m = $item($sections[$parts[0]], $parts[1]);

    if (!$m) {
        $d = $defaults['pages']['notFound'];
        return ['status' => 404, 'title' => $d['title'], 'description' => $d['description'], 'noindex' => true, 'path' => $path];
    }
    return $m + ['status' => 200, 'noindex' => false, 'path' => $path];
}

function inject_meta(string $html, array $m): string
{
    $e = fn($s) => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $host = preg_replace('/^www\./', '', explode(':', $_SERVER['HTTP_HOST'] ?? 'pro-orgazm.ru')[0]);
    $keep = array_filter(['category' => $_GET['category'] ?? '', 'page' => $_GET['page'] ?? ''], fn($v) => is_string($v) && $v !== '');
    $url = ($https ? 'https' : 'http') . "://$host" . ($m['path'] === '/' ? '/' : $m['path']) . ($keep ? '?' . http_build_query($keep) : '');

    $html = preg_replace('#<title>.*?</title>#s', '<title>' . $e($m['title']) . '</title>', $html, 1);
    $html = preg_replace('#<meta name="description" content="[^"]*"\s*/?>#', $m['description'] !== '' ? '<meta name="description" content="' . $e($m['description']) . '" />' : '', $html, 1);
    $tags = $m['noindex']
        ? '<meta name="robots" content="noindex, follow" />'
        : '<link rel="canonical" href="' . $e($url) . '" />'
            . "\n    <meta property=\"og:type\" content=\"website\" />"
            . "\n    <meta property=\"og:site_name\" content=\"ProOrgazm\" />"
            . "\n    <meta property=\"og:title\" content=\"" . $e($m['title']) . '" />'
            . "\n    <meta property=\"og:description\" content=\"" . $e($m['description']) . '" />'
            . "\n    <meta property=\"og:url\" content=\"" . $e($url) . '" />';
    return preg_replace('#</head>#', "    $tags\n  </head>", $html, 1);
}
