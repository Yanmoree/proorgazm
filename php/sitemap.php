<?php
// /sitemap.xml — собирается из базы при каждом запросе: новые и скрытые в админке страницы учитываются сразу.

declare(strict_types=1);

$CONFIG = require __DIR__ . '/../config.php';
require __DIR__ . '/api/lib.php';

$https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$host = preg_replace('/^www\./', '', explode(':', $_SERVER['HTTP_HOST'] ?? 'pro-orgazm.ru')[0]);
$base = ($https ? 'https' : 'http') . "://$host";

$latest = function (string $collection): int {
    return (int) (one('SELECT MAX(updated_at) t FROM items WHERE collection = ? AND published = 1', [$collection])['t'] ?? 0);
};
$all = max($latest('massages'), $latest('masters'), $latest('articles'));

$urls = [
    ['/', $all, 'daily', '1.0'],
    ['/massages', $latest('massages'), 'weekly', '0.9'],
    ['/masters', $latest('masters'), 'weekly', '0.8'],
    ['/blog', $latest('articles'), 'weekly', '0.7'],
    ['/reviews', 0, 'weekly', '0.6'],
    ['/contacts', 0, 'monthly', '0.6'],
];
$sections = ['massages' => ['/massages/', '0.8'], 'masters' => ['/masters/', '0.7'], 'articles' => ['/blog/', '0.6']];
foreach ($sections as $collection => [$prefix, $prio]) {
    foreach (all('SELECT slug, updated_at FROM items WHERE collection = ? AND published = 1 ORDER BY sort, id', [$collection]) as $r) {
        $urls[] = [$prefix . rawurlencode($r['slug']), (int) $r['updated_at'], 'monthly', $prio];
    }
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: no-cache');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as [$path, $t, $freq, $prio]) {
    echo "  <url>\n    <loc>" . htmlspecialchars($base . $path, ENT_XML1) . "</loc>\n";
    if ($t > 0) echo '    <lastmod>' . date('Y-m-d', intdiv($t, 1000)) . "</lastmod>\n";
    echo "    <changefreq>$freq</changefreq>\n    <priority>$prio</priority>\n  </url>\n";
}
echo "</urlset>\n";
