import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SLUG_RENAMES, legacyRedirect } from '../src/lib/routes.js'
import { dk, DIKIDI, DIKIDI_REVIEWS, DIKIDI_CONSULT, DIKIDI_TRAINING, contacts, massages, masters, reviews, articles, photos, pageFaq } from '../src/data/site.js'

// Полные тексты статей лежат рядом со статикой, чтобы их видел и сайт без API (Surge)
const ARTICLES_DIR = fileURLToPath(new URL('../public/content/articles/', import.meta.url))
const articleFull = ({ slug, sort, ...meta }) => {
  const file = `${ARTICLES_DIR}${slug}.json`
  const body = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).body : ''
  return { ...meta, body }
}

const articleBody = `Вступительный абзац статьи — короткое введение в тему, которое объясняет, о чём пойдёт речь и почему это важно.

## Почему это важно

Основной текст статьи. Его можно редактировать в админ-панели: обычные абзацы разделяются пустой строкой, подзаголовки начинаются с «## », списки — с «- », цитаты — с «> ».

- Пункт списка с важной мыслью
- Ещё один пункт, раскрывающий тему
- Третий пункт с практическим советом

> Забота о себе — это не роскошь, а необходимость

## Что делать дальше

Заключительный абзац с выводами и мягким призывом попробовать одну из программ салона.`

function seedReviews(db, now) {
  const ins = db.prepare('INSERT INTO reviews (name, master, text, rating, status, created_at) VALUES (?, ?, ?, 5, ?, ?)')
  reviews.forEach((r, i) => ins.run(r.name, r.master, r.text, 'approved', now - (i + 1) * 9 * 864e5))
}

// Обновление уже заполненной базы до контента с оригинального сайта (v2).
// Перезаписывает только поля, пришедшие из site.js; правки других полей в админке сохраняются.
export function migrateV2(db) {
  const now = Date.now()
  const upd = db.prepare('UPDATE items SET data = ?, updated_at = ? WHERE collection = ? AND slug = ?')
  const get = db.prepare('SELECT data FROM items WHERE collection = ? AND slug = ?')
  const apply = (collection, list, keys) =>
    list.forEach((item) => {
      const row = get.get(collection, item.slug)
      if (!row) return
      const data = JSON.parse(row.data)
      for (const k of keys) data[k] = item[k]
      upd.run(JSON.stringify(data), now, collection, item.slug)
    })
  apply('massages', massages, ['duration', 'price', 'short', 'description', 'options', 'image'])
  apply('masters', masters, ['exp', 'age', 'height', 'weight', 'traits', 'bio', 'programs', 'gallery'])

  const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('site')
  const site = row ? JSON.parse(row.data) : {}
  site.contacts = { ...site.contacts, address: contacts.address, metro: contacts.metro, max: contacts.max }
  site.links = { ...site.links, training: DIKIDI_TRAINING }
  site.photos = { ...photos, ...site.photos }
  db.prepare('INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data').run('site', JSON.stringify(site))

  // Добавляем отзывы с оригинала, которых ещё нет
  const has = db.prepare('SELECT 1 FROM reviews WHERE name = ? AND text = ?')
  const ins = db.prepare('INSERT INTO reviews (name, master, text, rating, status, created_at) VALUES (?, ?, ?, 5, ?, ?)')
  reviews.forEach((r, i) => { if (!has.get(r.name, r.text)) ins.run(r.name, r.master, r.text, 'approved', now - (i + 1) * 9 * 864e5) })
}

// v3: блоки «Вопрос-ответ», фото мастеров убраны, на крупных местах — фото в высоком разрешении
export function migrateV3(db) {
  const now = Date.now()
  const rows = db.prepare('SELECT id, collection, slug, data FROM items').all()
  const upd = db.prepare('UPDATE items SET data = ?, updated_at = ? WHERE id = ?')
  const seedBy = { massages, masters, articles }
  const isStock = (u) => /^\/images\/photo\d\.jpeg$/.test(u)
  for (const row of rows) {
    const data = JSON.parse(row.data)
    const src = seedBy[row.collection]?.find((x) => x.slug === row.slug)
    if (!data.faq && src?.faq) data.faq = src.faq
    // Убираем только стартовые фото, загруженные через админку не трогаем
    if (row.collection === 'masters') data.gallery = (data.gallery || []).filter((u) => !isStock(u))
    if (row.collection === 'massages' && src && isStock(data.image)) data.image = src.image
    upd.run(JSON.stringify(data), now, row.id)
  }
  const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('site')
  const site = row ? JSON.parse(row.data) : {}
  site.faq = site.faq || pageFaq
  site.photos = Object.fromEntries(Object.entries({ ...photos, ...site.photos }).map(([k, v]) => [k, isStock(v) ? photos[k] : v]))
  db.prepare('INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data').run('site', JSON.stringify(site))
}

// v4: английские адреса, фото мастеров и атмосферы, тексты, порядок на карточках, статьи без «вопрос-ответ»
export function migrateV4(db) {
  const now = Date.now()
  const isStock = (u) => !u || /^\/images\/photo\d\.jpeg$/.test(u)
  const renameMassage = (slug) => SLUG_RENAMES.massages[slug] || slug

  db.exec('BEGIN')
  const upd = db.prepare('UPDATE items SET slug = ?, data = ?, updated_at = ? WHERE id = ?')
  for (const row of db.prepare('SELECT id, collection, slug, data FROM items').all()) {
    const data = JSON.parse(row.data)
    const slug = SLUG_RENAMES[row.collection]?.[row.slug] || row.slug
    const src = { massages, masters, articles }[row.collection]?.find((x) => x.slug === slug)
    if (row.collection === 'massages') {
      if (isStock(data.image)) delete data.image
      if (src && data.titleFirst === undefined) data.titleFirst = !!src.titleFirst
      if (src) data.description = src.description
    }
    if (row.collection === 'masters') {
      data.programs = (data.programs || []).map(renameMassage)
      if (src && isStock(data.image)) data.image = src.image
      if (src && !(data.gallery || []).length) data.gallery = src.gallery
    }
    if (row.collection === 'articles') delete data.faq
    upd.run(slug, JSON.stringify(data), now, row.id)
  }

  const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('site')
  const site = row ? JSON.parse(row.data) : {}
  site.photos = Object.fromEntries(Object.entries({ ...photos, ...site.photos }).map(([k, v]) => [k, isStock(v) ? photos[k] : v]))
  if (!site.hero?.eyebrow || site.hero.eyebrow === 'Приватный салон для женщин · Москва') {
    site.hero = { ...site.hero, eyebrow: 'Салон эротического массажа для женщин в Москве' }
  }
  if (!site.seo?.title || site.seo.title === 'ProOrgazm — массаж для женщин в Москве') {
    site.seo = {
      title: 'ProOrgazm — салон эротического массажа для женщин в Москве',
      description: 'Салон эротического массажа для женщин в Москве: ул. Плющиха, 27, м. Смоленская. 6 программ, опытные мастера, выезд, полная конфиденциальность. Работаем 24/7.',
    }
  }
  db.prepare('INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data').run('site', JSON.stringify(site))

  // Статистика: старые адреса страниц → новые, чтобы отчёты не делились надвое
  const updPath = db.prepare('UPDATE events SET path = ? WHERE path = ?')
  for (const { path } of db.prepare('SELECT DISTINCT path FROM events').all()) {
    const next = path && legacyRedirect(path)
    if (next) updPath.run(next, path)
  }
  db.exec('COMMIT')
}

// v5: настоящие статьи с proorgazm.ru вместо шаблонных. Свои статьи из админки не трогаем
export function migrateV5(db) {
  const now = Date.now()
  db.exec('BEGIN')
  const rows = db.prepare("SELECT id, slug, data FROM items WHERE collection = 'articles'").all()
  for (const row of rows) {
    if (JSON.parse(row.data).body === articleBody) db.prepare('DELETE FROM items WHERE id = ?').run(row.id)
  }
  const exists = db.prepare("SELECT 1 FROM items WHERE collection = 'articles' AND slug = ?")
  const ins = db.prepare("INSERT INTO items (collection, slug, sort, published, data, created_at, updated_at) VALUES ('articles', ?, ?, 1, ?, ?, ?)")
  articles.forEach((a, i) => { if (!exists.get(a.slug)) ins.run(a.slug, i, JSON.stringify(articleFull(a)), now, now) })
  db.exec('COMMIT')
}

// v6: у мастеров одна галерея (первое фото — обложка), у программ появилась своя галерея
export function migrateV6(db) {
  const now = Date.now()
  db.exec('BEGIN')
  const upd = db.prepare('UPDATE items SET data = ?, updated_at = ? WHERE id = ?')
  for (const row of db.prepare("SELECT id, collection, data FROM items WHERE collection IN ('masters', 'massages')").all()) {
    const data = JSON.parse(row.data)
    const gallery = Array.isArray(data.gallery) ? data.gallery : []
    if (row.collection === 'masters' && data.image) {
      data.gallery = [data.image, ...gallery.filter((u) => u !== data.image)]
      data.image = ''
    } else if (row.collection === 'massages') {
      data.gallery = gallery
    }
    upd.run(JSON.stringify(data), now, row.id)
  }
  db.exec('COMMIT')
}

export function seed(db) {
  const now = Date.now()
  const ins = db.prepare(
    'INSERT INTO items (collection, slug, sort, published, data, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
  )
  const put = (collection, list, extra = () => ({})) =>
    list.forEach(({ slug, ...rest }, i) =>
      ins.run(collection, slug, i, JSON.stringify({ image: '', ...rest, ...extra(rest) }), now, now),
    )

  put('massages', massages)
  put('masters', masters)
  articles.forEach((a, i) => ins.run('articles', a.slug, i, JSON.stringify(articleFull(a)), now, now))

  db.prepare('INSERT INTO settings (key, data) VALUES (?, ?)').run(
    'site',
    JSON.stringify({
      contacts,
      links: { booking: DIKIDI, reviews: DIKIDI_REVIEWS, consult: DIKIDI_CONSULT, training: DIKIDI_TRAINING },
      photos,
      faq: pageFaq,
      hero: {
        eyebrow: 'Салон эротического массажа для женщин в Москве',
        title: 'Ваше удовольствие',
        accent: 'в наших руках',
        subtitle: 'Добро пожаловать в мир настоящего расслабления. Гарантируем качество, конфиденциальность и безопасность — 24/7.',
      },
      seo: {
        title: 'ProOrgazm — салон эротического массажа для женщин в Москве',
        description: 'Салон эротического массажа для женщин в Москве: ул. Плющиха, 27, м. Смоленская. 6 программ, опытные мастера, выезд, полная конфиденциальность. Работаем 24/7.',
      },
    }),
  )

  seedReviews(db, now)

  // Немного демо-статистики, чтобы дашборд не был пустым
  const insEv = db.prepare('INSERT INTO events (type, path, label, vid, device, referrer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const paths = ['/', '/', '/', '/massages', '/massages/120-min-massage', '/massages/240-min-massage', '/masters', '/reviews', '/contacts', '/blog']
  const refs = ['yandex.ru', 'google.com', '', '', 't.me', 'instagram.com']
  const labels = ['Главная · hero', 'Программа-максимум', 'Классическая программа', 'Знакомство', 'Илья Соболев', 'Сергей Богданов']
  const rnd = (a) => a[Math.floor(Math.random() * a.length)]
  db.exec('BEGIN')
  for (let d = 29; d >= 0; d--) {
    const visitors = 25 + Math.floor(Math.random() * 30) + (29 - d)
    for (let v = 0; v < visitors; v++) {
      const vid = `seed-${d}-${v}`
      const device = Math.random() < 0.7 ? 'mobile' : 'desktop'
      const t = now - d * 864e5 - Math.floor(Math.random() * 864e5)
      const ref = rnd(refs)
      const views = 1 + Math.floor(Math.random() * 4)
      for (let p = 0; p < views; p++) insEv.run('pageview', p === 0 ? '/' : rnd(paths), null, vid, device, p === 0 ? ref : '', t + p * 40000)
      if (Math.random() < 0.12) insEv.run('booking', rnd(paths), rnd(labels), vid, device, '', t + 200000)
      if (Math.random() < 0.06) insEv.run(rnd(['telegram', 'whatsapp', 'phone']), '/', null, vid, device, '', t + 250000)
    }
  }
  db.exec('COMMIT')
}

// v7: у программ с несколькими длительностями — своя ссылка DIKIDI на каждый вариант.
// Варианты, уже отредактированные в админке (с третьей частью), не трогаем
export function migrateV7(db) {
  const upd = db.prepare('UPDATE items SET data = ?, updated_at = ? WHERE id = ?')
  for (const row of db.prepare("SELECT id, slug, data FROM items WHERE collection = 'massages'").all()) {
    const src = massages.find((m) => m.slug === row.slug)
    if (!src || !src.options) continue
    const data = JSON.parse(row.data)
    const lines = String(data.options || '').split('\n').filter((l) => l.trim())
    if (lines.some((l) => l.split('|').length > 2)) continue
    data.options = src.options
    if (row.slug === 'massage-for-wife-with-husband' && data.booking === dk(8246530)) data.booking = src.booking
    upd.run(JSON.stringify(data), Date.now(), row.id)
  }
}
