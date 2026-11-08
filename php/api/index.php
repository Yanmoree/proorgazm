<?php
// API сайта для обычного PHP-хостинга (Таймвеб и т. п.), где нет Node.js.
// Повторяет server/routes/*.js: те же адреса /api/..., те же ответы, та же база SQLite.
// Настройки (путь к базе, хеш пароля) — в config.php уровнем выше папки сайта, в репозиторий не попадает.

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');

$CONFIG = require __DIR__ . '/../../config.php';
require __DIR__ . '/lib.php';

// Запуск из консоли/cron: php index.php refresh-rating
if (PHP_SAPI === 'cli') {
    if (($argv[1] ?? '') === 'refresh-rating') { var_export(refresh_rating()); echo "\n"; }
    if (($argv[1] ?? '') === 'migrate') { echo migrate(), "\n"; }
    exit;
}

set_exception_handler(function (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_out(['error' => 'Ошибка сервера'], 500);
});

$method = $_SERVER['REQUEST_METHOD'];
$path = '/' . trim(preg_replace('#^/api#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');
$seg = array_values(array_filter(explode('/', $path), 'strlen'));

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// ---------- Публичная часть ----------

if ($path === '/content' && $method === 'GET') {
    maybe_refresh_rating();
    $stats = setting('dikidi');
    $articles = array_map(function ($a) { unset($a['body']); return $a; }, list_items('articles'));
    json_out([
        'settings' => (object) setting('site'),
        'massages' => list_items('massages'),
        'masters' => list_items('masters'),
        'articles' => $articles,
        'reviews' => all("SELECT id, name, master, text, rating, created_at FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"),
        'ratings' => $stats['ratings'] ?? null,
        'rating' => $stats['rating'] ?? null,
    ]);
}

if (count($seg) === 2 && $seg[0] === 'articles' && $method === 'GET') {
    $a = get_item('articles', $seg[1]);
    $a ? json_out($a) : json_out(['error' => 'Статья не найдена'], 404);
}

if ($path === '/reviews' && $method === 'POST') {
    rate_limit('review', 3, 3600);
    $b = body();
    $name = str($b['name'] ?? '', 60);
    $text = str($b['text'] ?? '', 2000);
    $rating = min(5, max(1, (int) ($b['rating'] ?? 5) ?: 5));
    if (mb_strlen($name) < 2 || mb_strlen($text) < 10) json_out(['error' => 'Укажите имя и текст отзыва (от 10 символов)'], 400);
    run('INSERT INTO reviews (name, master, text, rating, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [$name, str($b['master'] ?? '', 60) ?: null, $text, $rating, 'pending', now_ms()]);
    json_out(['ok' => true], 201);
}

if ($path === '/leads' && $method === 'POST') {
    rate_limit('lead', 5, 3600);
    $b = body();
    $name = str($b['name'] ?? '', 60);
    $phone = str($b['phone'] ?? '', 30);
    if (mb_strlen($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) < 10) json_out(['error' => 'Укажите имя и корректный телефон'], 400);
    if (empty($b['consent'])) json_out(['error' => 'Нужно согласие на обработку данных'], 400);
    run('INSERT INTO leads (name, phone, message, source, created_at) VALUES (?, ?, ?, ?, ?)',
        [$name, $phone, str($b['message'] ?? '', 2000), str($b['source'] ?? '', 100), now_ms()]);
    json_out(['ok' => true], 201);
}

if ($path === '/track' && $method === 'POST') {
    rate_limit('track', 300, 600);
    $b = body();
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $type = str($b['type'] ?? '', 20);
    $types = ['pageview', 'booking', 'telegram', 'whatsapp', 'max', 'phone'];
    if (!in_array($type, $types, true) || preg_match('/bot|crawl|spider|slurp|headless|lighthouse/i', $ua)) no_content();
    $referrer = '';
    $host = parse_url(str($b['ref'] ?? '', 500), PHP_URL_HOST);
    if ($host) {
        $host = preg_replace('/^www\./', '', strtolower($host));
        $self = preg_replace('/^www\./', '', strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]));
        if ($host !== $self) $referrer = $host;
    }
    run('INSERT INTO events (type, path, label, vid, device, referrer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        $type, str($b['path'] ?? '', 200), str($b['label'] ?? '', 120) ?: null, str($b['vid'] ?? '', 64),
        preg_match('/mobile|android|iphone|ipad/i', $ua) ? 'mobile' : 'desktop', $referrer, now_ms(),
    ]);
    no_content();
}

// ---------- Админка ----------

if (($seg[0] ?? '') !== 'admin') json_out(['error' => 'Не найдено'], 404);
array_shift($seg);
$path = '/' . implode('/', $seg);

if ($path === '/login' && $method === 'POST') {
    rate_limit('login', 10, 900);
    $b = body();
    $token = login(str($b['username'] ?? '', 100), str($b['password'] ?? '', 200));
    $token ? json_out(['token' => $token]) : json_out(['error' => 'Неверный логин или пароль'], 401);
}

$token = require_admin();

if ($path === '/logout' && $method === 'POST') {
    run('DELETE FROM sessions WHERE token = ?', [$token]);
    json_out(['ok' => true]);
}
if ($path === '/me') json_out(['ok' => true]);

// Контент: /items/:collection[/:id | /reorder]
if (($seg[0] ?? '') === 'items') {
    $collection = $seg[1] ?? '';
    if (!isset(FIELDS[$collection])) json_out(['error' => 'Неизвестный раздел'], 404);
    $sub = $seg[2] ?? null;

    if ($sub === null && $method === 'GET') json_out(list_items($collection, true));

    if ($sub === null && $method === 'POST') {
        $b = body();
        $data = pick($collection, $b);
        $title = title_of($collection, $data);
        if (!$title) json_out(['error' => 'Заполните название'], 400);
        $slug = slugify((string) ($b['slug'] ?? '') ?: $title);
        if (!$slug) json_out(['error' => 'Некорректный адрес страницы'], 400);
        $sort = (int) one('SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM items WHERE collection = ?', [$collection])['s'];
        try {
            $now = now_ms();
            run('INSERT INTO items (collection, slug, sort, published, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$collection, $slug, $sort, ($b['published'] ?? true) === false ? 0 : 1, jenc($data), $now, $now]);
        } catch (PDOException $e) {
            json_out(['error' => 'Страница с таким адресом уже существует'], 409);
        }
        json_out(get_item($collection, (int) db()->lastInsertId(), true), 201);
    }

    if ($sub === 'reorder' && $method === 'POST') {
        $ids = array_map('intval', (array) (body()['ids'] ?? []));
        db()->beginTransaction();
        foreach ($ids as $i => $id) run('UPDATE items SET sort = ? WHERE id = ? AND collection = ?', [$i, $id, $collection]);
        db()->commit();
        json_out(['ok' => true]);
    }

    if ($sub !== null && ctype_digit($sub)) {
        $id = (int) $sub;
        if ($method === 'PUT') {
            $current = get_item($collection, $id, true);
            if (!$current) json_out(['error' => 'Не найдено'], 404);
            $b = body();
            $old = $current;
            foreach (['id', 'slug', 'sort', 'published', 'updatedAt'] as $k) unset($old[$k]);
            $data = array_merge($old, pick($collection, $b));
            $slug = !empty($b['slug']) ? slugify((string) $b['slug']) : $current['slug'];
            $published = array_key_exists('published', $b) ? (!empty($b['published']) ? 1 : 0) : ($current['published'] ? 1 : 0);
            try {
                run('UPDATE items SET slug = ?, published = ?, data = ?, updated_at = ? WHERE id = ?', [$slug, $published, jenc($data), now_ms(), $id]);
            } catch (PDOException $e) {
                json_out(['error' => 'Страница с таким адресом уже существует'], 409);
            }
            json_out(get_item($collection, $id, true));
        }
        if ($method === 'DELETE') {
            run('DELETE FROM items WHERE id = ? AND collection = ?', [$id, $collection]);
            json_out(['ok' => true]);
        }
    }
    json_out(['error' => 'Не найдено'], 404);
}

if ($path === '/settings' && $method === 'GET') json_out((object) setting('site'));

if ($path === '/settings' && $method === 'PUT') {
    $b = body();
    $faq = $b['faq'] ?? null;
    unset($b['faq']);
    $merged = array_merge(setting('site'), clean_settings($b));
    if (is_array($faq)) {
        $out = [];
        foreach (['massages', 'masters', 'blog'] as $k) $out[$k] = array_key_exists($k, $faq) ? clean_faq($faq[$k]) : ($merged['faq'][$k] ?? []);
        $merged['faq'] = $out;
    }
    save_setting('site', $merged);
    json_out((object) $merged);
}

// Отзывы и заявки
if (($seg[0] ?? '') === 'reviews') {
    $id = isset($seg[1]) ? (int) $seg[1] : 0;
    if (!$id && $method === 'GET') json_out(all('SELECT * FROM reviews ORDER BY created_at DESC'));
    if ($id && $method === 'PATCH') {
        $b = body();
        if (in_array($b['status'] ?? null, ['pending', 'approved', 'rejected'], true)) run('UPDATE reviews SET status = ? WHERE id = ?', [$b['status'], $id]);
        if (!empty($b['text'])) run('UPDATE reviews SET text = ? WHERE id = ?', [str((string) $b['text'], 2000), $id]);
        json_out(one('SELECT * FROM reviews WHERE id = ?', [$id]));
    }
    if ($id && $method === 'DELETE') { run('DELETE FROM reviews WHERE id = ?', [$id]); json_out(['ok' => true]); }
}

if (($seg[0] ?? '') === 'leads') {
    $id = isset($seg[1]) ? (int) $seg[1] : 0;
    if (!$id && $method === 'GET') json_out(all('SELECT * FROM leads ORDER BY created_at DESC'));
    if ($id && $method === 'PATCH') {
        $s = body()['status'] ?? '';
        run('UPDATE leads SET status = ? WHERE id = ?', [in_array($s, ['new', 'in_progress', 'done'], true) ? $s : 'new', $id]);
        json_out(one('SELECT * FROM leads WHERE id = ?', [$id]));
    }
    if ($id && $method === 'DELETE') { run('DELETE FROM leads WHERE id = ?', [$id]); json_out(['ok' => true]); }
}

if ($path === '/stats' && $method === 'GET') json_out(stats((int) ($_GET['days'] ?? 30)));
if ($path === '/stats' && $method === 'DELETE') { db()->exec('DELETE FROM events'); json_out(['ok' => true]); }

if ($path === '/upload' && $method === 'POST') json_out(upload_image(), 201);

json_out(['error' => 'Не найдено'], 404);
