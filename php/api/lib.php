<?php
// Общие функции PHP-версии API: база, ввод/вывод, доступ, контент, статистика, загрузка фото, рейтинг DIKIDI.

declare(strict_types=1);
date_default_timezone_set('Europe/Moscow');

const FIELDS = [
    'massages' => ['title' => 120, 'duration' => 40, 'price' => 40, 'tag' => 30, 'short' => 400, 'description' => 8000, 'options' => 2000, 'booking' => 500, 'image' => 300, 'gallery' => 'urls', 'faq' => 'faq', 'titleFirst' => 'bool'],
    'masters' => ['name' => 120, 'role' => 60, 'exp' => 30, 'age' => 20, 'height' => 20, 'weight' => 20, 'bio' => 8000, 'booking' => 500, 'image' => 300, 'traits' => 'list', 'programs' => 'list', 'gallery' => 'urls', 'faq' => 'faq'],
    'articles' => ['title' => 200, 'category' => 60, 'read' => 20, 'date' => 40, 'excerpt' => 500, 'body' => 50000, 'image' => 300, 'faq' => 'faq'],
];
const SESSION_TTL = 7 * 86400 * 1000;
const UTC_OFFSET_SEC = 3 * 3600; // Москва, для группировки статистики по дням

// ---------- База ----------

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    global $CONFIG;
    $pdo = new PDO('sqlite:' . $CONFIG['db_path'], null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS rate_hits (k TEXT NOT NULL, t INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS rate_hits_k ON rate_hits (k, t)');
    return $pdo;
}

function run(string $sql, array $args = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}
function one(string $sql, array $args = []): ?array { $r = run($sql, $args)->fetch(); return $r ?: null; }
function all(string $sql, array $args = []): array { return run($sql, $args)->fetchAll(); }

function now_ms(): int { return (int) floor(microtime(true) * 1000); }
function jenc($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }

function setting(string $key): array
{
    $row = one('SELECT data FROM settings WHERE key = ?', [$key]);
    return $row ? (json_decode($row['data'], true) ?: []) : [];
}
function save_setting(string $key, array $data): void
{
    run('INSERT OR REPLACE INTO settings (key, data) VALUES (?, ?)', [$key, jenc($data)]);
}

function parse_item(?array $row): ?array
{
    if (!$row) return null;
    $data = json_decode($row['data'], true) ?: [];
    return array_merge(
        ['id' => (int) $row['id'], 'slug' => $row['slug'], 'sort' => (int) $row['sort'], 'published' => (bool) $row['published']],
        $data,
        ['updatedAt' => (int) $row['updated_at']],
    );
}

function list_items(string $collection, bool $all = false): array
{
    $rows = all('SELECT * FROM items WHERE collection = ? ' . ($all ? '' : 'AND published = 1') . ' ORDER BY sort, id', [$collection]);
    return array_map('parse_item', $rows);
}

function get_item(string $collection, $by, bool $all = false): ?array
{
    $col = is_int($by) ? 'id' : 'slug';
    return parse_item(one("SELECT * FROM items WHERE collection = ? AND $col = ? " . ($all ? '' : 'AND published = 1'), [$collection, $by]));
}

// ---------- Ввод / вывод ----------

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo jenc($data);
    exit;
}
function no_content(): void { http_response_code(204); exit; }

function body(): array
{
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input') ?: '';
    $b = json_decode($raw, true);
    if (!is_array($b)) $b = [];
    return $b;
}

// Как str() в server/util.js: только строки, обрезка пробелов и длины
function str($v, int $max = 500): string
{
    return is_string($v) ? mb_substr(trim($v), 0, $max) : '';
}
function to_str($v): string
{
    if (is_bool($v)) return $v ? 'true' : 'false';
    if ($v === null) return '';
    if (is_scalar($v)) return (string) $v;
    return '';
}

function slugify(string $s): string
{
    $s = mb_strtolower(str($s, 120));
    $s = preg_replace('/[^a-z0-9а-яё\s-]/iu', '', $s);
    $map = ['а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'c','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya'];
    $s = strtr($s, $map);
    $s = preg_replace('/\s+/u', '-', $s);
    $s = preg_replace('/-+/', '-', $s);
    return trim($s, '-');
}

function client_ip(): string { return $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? ''; }

// Не больше $max запросов за $windowSec с одного IP на ключ
function rate_limit(string $key, int $max, int $windowSec): void
{
    $k = $key . ':' . client_ip();
    $now = now_ms();
    if (random_int(1, 50) === 1) run('DELETE FROM rate_hits WHERE t < ?', [$now - 86400 * 1000]);
    $n = (int) one('SELECT COUNT(*) n FROM rate_hits WHERE k = ? AND t > ?', [$k, $now - $windowSec * 1000])['n'];
    if ($n >= $max) json_out(['error' => 'Слишком много запросов, попробуйте позже'], 429);
    run('INSERT INTO rate_hits (k, t) VALUES (?, ?)', [$k, $now]);
}

// ---------- Доступ ----------

function login(string $user, string $pass): ?string
{
    global $CONFIG;
    // Пароль проверяем и при неверном логине, чтобы время ответа не выдавало, что именно неверно
    $passOk = password_verify($pass, $CONFIG['admin_pass_hash']);
    if (!hash_equals($CONFIG['admin_user'], $user) || !$passOk) return null;
    reset_sessions_if_password_changed();
    $token = bin2hex(random_bytes(32));
    run('INSERT INTO sessions (token, created_at) VALUES (?, ?)', [$token, now_ms()]);
    run('DELETE FROM sessions WHERE created_at < ?', [now_ms() - SESSION_TTL]);
    return $token;
}

// Сменили логин или пароль в config.php — выходим из всех старых сессий
function reset_sessions_if_password_changed(): void
{
    global $CONFIG;
    $fp = hash('sha256', $CONFIG['admin_user'] . ':' . $CONFIG['admin_pass_hash']);
    $row = one("SELECT value FROM meta WHERE key = 'auth'");
    if (($row['value'] ?? null) !== $fp) {
        db()->exec('DELETE FROM sessions');
        run("INSERT OR REPLACE INTO meta (key, value) VALUES ('auth', ?)", [$fp]);
    }
}

function auth_header(): string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    }
    return $h;
}

function require_admin(): string
{
    reset_sessions_if_password_changed();
    $token = preg_replace('/^Bearer\s+/i', '', auth_header());
    $row = $token ? one('SELECT created_at FROM sessions WHERE token = ?', [$token]) : null;
    if (!$row || now_ms() - (int) $row['created_at'] > SESSION_TTL) json_out(['error' => 'Требуется вход'], 401);
    return $token;
}

// ---------- Контент ----------

function clean_faq($list): array
{
    $out = [];
    foreach (is_array($list) ? $list : [] as $x) {
        $q = str(to_str($x['q'] ?? ''), 300);
        $a = str(to_str($x['a'] ?? ''), 3000);
        if ($q !== '' && $a !== '') $out[] = ['q' => $q, 'a' => $a];
    }
    return array_slice($out, 0, 30);
}

function pick(string $collection, array $body): array
{
    $out = [];
    foreach (FIELDS[$collection] as $k => $max) {
        if (!array_key_exists($k, $body)) continue;
        $v = $body[$k];
        $arr = function () use ($v, $max) {
            $list = is_array($v) ? $v : explode(',', to_str($v));
            $list = array_map(fn($s) => str(to_str($s), $max === 'urls' ? 300 : 60), $list);
            return array_values(array_filter($list, fn($s) => $s !== ''));
        };
        if ($max === 'bool') $out[$k] = $v === true || $v === 'true';
        elseif ($max === 'faq') $out[$k] = clean_faq($v);
        elseif ($max === 'list') $out[$k] = array_slice($arr(), 0, 12);
        elseif ($max === 'urls') $out[$k] = array_slice(array_values(array_filter($arr(), fn($u) => preg_match('#^(/(uploads|images)/|https://)#', $u))), 0, 20);
        else $out[$k] = str(to_str($v), $max);
    }
    return $out;
}

function title_of(string $collection, array $data): string
{
    return (string) ($collection === 'masters' ? ($data['name'] ?? '') : ($data['title'] ?? ''));
}

function clean_settings($obj, int $depth = 0): array
{
    $out = [];
    foreach (array_slice(is_array($obj) ? $obj : [], 0, 40, true) as $k => $v) {
        $out[str((string) $k, 40)] = is_array($v) && $depth < 2 ? (object) clean_settings($v, $depth + 1) : str(to_str($v), 1000);
    }
    return $out;
}

// ---------- Статистика ----------

function stats(int $days): array
{
    $days = in_array($days, [7, 30, 90], true) ? $days : 30;
    $now = now_ms();
    $since = $now - $days * 86400000;
    $prevSince = $since - $days * 86400000;
    $n = fn(string $sql, array $a = []) => (int) one($sql, $a)['n'];
    $totals = fn(int $from, int $to) => [
        'views' => $n("SELECT COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? AND created_at < ?", [$from, $to]),
        'visitors' => $n("SELECT COUNT(DISTINCT vid) n FROM events WHERE type = 'pageview' AND created_at >= ? AND created_at < ?", [$from, $to]),
        'bookings' => $n("SELECT COUNT(*) n FROM events WHERE type = 'booking' AND created_at >= ? AND created_at < ?", [$from, $to]),
        'contacts' => $n("SELECT COUNT(*) n FROM events WHERE type IN ('telegram','whatsapp','max','phone') AND created_at >= ? AND created_at < ?", [$from, $to]),
        'leads' => $n('SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND created_at < ?', [$from, $to]),
    ];
    $day = "date(created_at / 1000 + " . UTC_OFFSET_SEC . ", 'unixepoch')";
    $rows = all("SELECT $day d,
        SUM(type = 'pageview') views,
        COUNT(DISTINCT CASE WHEN type = 'pageview' THEN vid END) visitors,
        SUM(type = 'booking') bookings
        FROM events WHERE created_at >= ? GROUP BY d ORDER BY d", [$since]);
    $byDay = [];
    foreach ($rows as $r) $byDay[$r['d']] = $r;
    $series = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $key = date('Y-m-d', intdiv($now, 1000) - $i * 86400);
        $r = $byDay[$key] ?? null;
        $series[] = ['date' => $key, 'views' => (int) ($r['views'] ?? 0), 'visitors' => (int) ($r['visitors'] ?? 0), 'bookings' => (int) ($r['bookings'] ?? 0)];
    }
    return [
        'days' => $days,
        'totals' => $totals($since, $now + 1),
        'previous' => $totals($prevSince, $since),
        'series' => $series,
        'topPages' => all("SELECT path, COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? GROUP BY path ORDER BY n DESC LIMIT 8", [$since]),
        'bookingSources' => all("SELECT COALESCE(label, path) label, COUNT(*) n FROM events WHERE type = 'booking' AND created_at >= ? GROUP BY 1 ORDER BY n DESC LIMIT 8", [$since]),
        'referrers' => all("SELECT CASE WHEN referrer = '' OR referrer IS NULL THEN 'Прямые заходы' ELSE referrer END ref, COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? AND (referrer IS NOT NULL) GROUP BY 1 ORDER BY n DESC LIMIT 6", [$since]),
        'devices' => all("SELECT device, COUNT(DISTINCT vid) n FROM events WHERE type = 'pageview' AND created_at >= ? GROUP BY device", [$since]),
        'contactsByType' => all("SELECT type, COUNT(*) n FROM events WHERE type IN ('telegram','whatsapp','max','phone') AND created_at >= ? GROUP BY type", [$since]),
        'pending' => [
            'reviews' => $n("SELECT COUNT(*) n FROM reviews WHERE status = 'pending'"),
            'leads' => $n("SELECT COUNT(*) n FROM leads WHERE status = 'new'"),
        ],
    ];
}

// ---------- Загрузка фото ----------

// Фото из админки сразу сжимаем: WebP 1600 px + копия 640 px для телефонов
function upload_image(): array
{
    $f = $_FILES['file'] ?? null;
    $bad = fn() => json_out(['error' => 'Загрузите изображение JPG, PNG, WebP или AVIF до 25 МБ'], 400);
    if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK || $f['size'] > 25 * 1024 * 1024) $bad();
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!preg_match('#^image/(jpeg|png|webp|avif|gif|heic|heif)$#', (string) $mime)) $bad();

    $dir = __DIR__ . '/../uploads';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $id = now_ms() . '-' . bin2hex(random_bytes(4));
    try {
        foreach ([1600, 640] as $w) {
            $img = new Imagick($f['tmp_name'] . '[0]'); // у GIF берём первый кадр
            if (method_exists($img, 'autoOrient')) $img->autoOrient();
            else autorotate($img);
            if ($img->getImageWidth() > $w || $img->getImageHeight() > $w) $img->thumbnailImage($w, $w, true);
            $img->stripImage();
            $img->setImageFormat('webp');
            $img->setImageCompressionQuality(80);
            $img->setOption('webp:method', '5');
            $img->writeImage("$dir/$id-$w.webp");
            $img->clear();
        }
    } catch (Throwable $e) {
        error_log('[upload] ' . $e->getMessage());
        json_out(['error' => 'Не удалось обработать изображение — попробуйте другой файл'], 400);
    }
    return ['url' => "/uploads/$id-1600.webp"];
}

function autorotate(Imagick $img): void
{
    switch ($img->getImageOrientation()) {
        case Imagick::ORIENTATION_BOTTOMRIGHT: $img->rotateImage('#000', 180); break;
        case Imagick::ORIENTATION_RIGHTTOP: $img->rotateImage('#000', 90); break;
        case Imagick::ORIENTATION_LEFTBOTTOM: $img->rotateImage('#000', -90); break;
    }
    $img->setImageOrientation(Imagick::ORIENTATION_TOPLEFT);
}

// ---------- Рейтинг DIKIDI ----------

// Настоящие средний балл и число оценок со страницы отзывов DIKIDI. Последнее удачное значение храним в базе.
function refresh_rating(int $timeout = 20): ?array
{
    $ch = curl_init('https://dikidi.net/536831?p=1.pi-pr');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => ['User-Agent: Mozilla/5.0 (compatible; ProOrgazmSite/1.0)', 'Accept-Language: ru,en;q=0.8'],
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!$html || $code !== 200) return setting('dikidi') ?: null;

    $text = preg_replace_callback('/\\\\u([0-9a-f]{4})/i', fn($m) => mb_chr(hexdec($m[1]), 'UTF-8'), $html);
    $text = str_replace(['\\/', '\\n'], ['/', ' '], $text);
    $text = preg_replace('/<[^>]+>/', ' ', $text);
    if (!preg_match('/(\d+)\s+(?:ratings?|оцен\S*)/iu', $text, $m) || (int) $m[1] <= 0) return setting('dikidi') ?: null;
    $rating = preg_match('/(\d(?:[.,]\d)?)\s*\/\s*5\b/', $text, $r) ? (float) str_replace(',', '.', $r[1]) : null;
    $data = ['ratings' => (int) $m[1], 'rating' => $rating >= 1 && $rating <= 5 ? $rating : null, 'updatedAt' => now_ms()];
    save_setting('dikidi', $data);
    return $data;
}

// Обновляем раз в 6 часов при запросе контента; неудачные попытки — не чаще раза в час
function maybe_refresh_rating(): void
{
    $stats = setting('dikidi');
    $age = now_ms() - (int) ($stats['updatedAt'] ?? 0);
    if ($age < 6 * 3600 * 1000) return;
    $attempt = setting('dikidi_attempt');
    if (now_ms() - (int) ($attempt['t'] ?? 0) < 3600 * 1000) return;
    save_setting('dikidi_attempt', ['t' => now_ms()]);
    refresh_rating(6);
}
