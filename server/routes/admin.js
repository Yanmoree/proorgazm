import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, listItems, getItem, getSettings } from '../db.js'
import { login, logout, requireAdmin } from '../auth.js'
import { rateLimit, str, slugify } from '../util.js'

export const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
export const adminApi = Router()

adminApi.post('/login', rateLimit('login', 10, 900e3), (req, res) => {
  const token = login(str(req.body.username, 100), str(req.body.password, 200))
  if (!token) return res.status(401).json({ error: 'Неверный логин или пароль' })
  res.json({ token })
})

adminApi.use(requireAdmin)

adminApi.post('/logout', (req, res) => {
  logout(req.token)
  res.json({ ok: true })
})

adminApi.get('/me', (req, res) => res.json({ ok: true }))

// ---------- Контент ----------

const FIELDS = {
  massages: { title: 120, duration: 40, price: 40, tag: 30, short: 400, description: 8000, options: 2000, booking: 500, image: 300, gallery: 'urls', faq: 'faq', titleFirst: 'bool', seoTitle: 200, seoDescription: 400 },
  masters: { name: 120, role: 60, exp: 30, age: 20, height: 20, weight: 20, bio: 8000, booking: 500, image: 300, traits: 'list', programs: 'list', gallery: 'urls', faq: 'faq', seoTitle: 200, seoDescription: 400 },
  articles: { title: 200, category: 60, read: 20, date: 40, excerpt: 500, body: 50000, image: 300, faq: 'faq', seoTitle: 200, seoDescription: 400 },
}

const pick = (collection, body) => {
  const out = {}
  for (const [k, max] of Object.entries(FIELDS[collection])) {
    if (!(k in body)) continue
    const arr = () => (Array.isArray(body[k]) ? body[k] : String(body[k]).split(',')).map((s) => str(String(s), max === 'urls' ? 300 : 60)).filter(Boolean)
    out[k] = max === 'bool' ? body[k] === true || body[k] === 'true'
      : max === 'faq' ? cleanFaq(body[k])
      : max === 'list' ? arr().slice(0, 12)
      : max === 'urls' ? arr().filter((u) => /^(\/(uploads|images)\/|https:\/\/)/.test(u)).slice(0, 20)
      : str(String(body[k] ?? ''), max)
  }
  return out
}

// [{ q, a }] — пустые пары отбрасываем
const cleanFaq = (list) =>
  (Array.isArray(list) ? list : [])
    .map((x) => ({ q: str(String(x?.q ?? ''), 300), a: str(String(x?.a ?? ''), 3000) }))
    .filter((x) => x.q && x.a)
    .slice(0, 30)

const titleOf = (collection, data) => (collection === 'masters' ? data.name : data.title)

adminApi.param('collection', (req, res, next, c) => (FIELDS[c] ? next() : res.status(404).json({ error: 'Неизвестный раздел' })))

adminApi.get('/items/:collection', (req, res) => res.json(listItems(req.params.collection, { all: true })))

adminApi.post('/items/:collection', (req, res) => {
  const { collection } = req.params
  const data = pick(collection, req.body)
  if (!titleOf(collection, data)) return res.status(400).json({ error: 'Заполните название' })
  const slug = slugify(req.body.slug || titleOf(collection, data))
  if (!slug) return res.status(400).json({ error: 'Некорректный адрес страницы' })
  const sort = db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM items WHERE collection = ?').get(collection).s
  try {
    const now = Date.now()
    const r = db
      .prepare('INSERT INTO items (collection, slug, sort, published, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(collection, slug, sort, req.body.published === false ? 0 : 1, JSON.stringify(data), now, now)
    res.status(201).json(getItem(collection, Number(r.lastInsertRowid), { all: true }))
  } catch {
    res.status(409).json({ error: 'Страница с таким адресом уже существует' })
  }
})

adminApi.put('/items/:collection/:id', (req, res) => {
  const { collection } = req.params
  const id = Number(req.params.id)
  const current = getItem(collection, id, { all: true })
  if (!current) return res.status(404).json({ error: 'Не найдено' })
  const { id: _i, slug: _s, sort: _o, published: _p, updatedAt: _u, ...old } = current
  const data = { ...old, ...pick(collection, req.body) }
  const slug = req.body.slug ? slugify(req.body.slug) : current.slug
  try {
    db.prepare('UPDATE items SET slug = ?, published = ?, data = ?, updated_at = ? WHERE id = ?').run(
      slug, 'published' in req.body ? (req.body.published ? 1 : 0) : (current.published ? 1 : 0), JSON.stringify(data), Date.now(), id,
    )
    res.json(getItem(collection, id, { all: true }))
  } catch {
    res.status(409).json({ error: 'Страница с таким адресом уже существует' })
  }
})

adminApi.post('/items/:collection/reorder', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : []
  const upd = db.prepare('UPDATE items SET sort = ? WHERE id = ? AND collection = ?')
  db.exec('BEGIN')
  ids.forEach((id, i) => upd.run(i, id, req.params.collection))
  db.exec('COMMIT')
  res.json({ ok: true })
})

adminApi.delete('/items/:collection/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ? AND collection = ?').run(Number(req.params.id), req.params.collection)
  res.json({ ok: true })
})

// ---------- Настройки ----------

adminApi.get('/settings', (req, res) => res.json(getSettings()))

adminApi.put('/settings', (req, res) => {
  const clean = (obj, depth = 0) =>
    Object.fromEntries(
      Object.entries(obj || {})
        .slice(0, 40)
        .map(([k, v]) => [str(k, 40), v && typeof v === 'object' && depth < 2 ? clean(v, depth + 1) : str(String(v ?? ''), 1000)]),
    )
  const { faq, ...rest } = req.body || {}
  const merged = { ...getSettings(), ...clean(rest) }
  if (faq && typeof faq === 'object') {
    merged.faq = Object.fromEntries(['massages', 'masters', 'blog'].map((k) => [k, k in faq ? cleanFaq(faq[k]) : merged.faq?.[k] || []]))
  }
  db.prepare('INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data').run('site', JSON.stringify(merged))
  res.json(merged)
})

// ---------- Отзывы и заявки ----------

adminApi.get('/reviews', (req, res) => res.json(db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all()))

adminApi.patch('/reviews/:id', (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.body.status) ? req.body.status : null
  if (status) db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, Number(req.params.id))
  if (req.body.text) db.prepare('UPDATE reviews SET text = ? WHERE id = ?').run(str(req.body.text, 2000), Number(req.params.id))
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id)))
})

adminApi.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

adminApi.get('/leads', (req, res) => res.json(db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all()))

adminApi.patch('/leads/:id', (req, res) => {
  const status = ['new', 'in_progress', 'done'].includes(req.body.status) ? req.body.status : 'new'
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, Number(req.params.id))
  res.json(db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id)))
})

adminApi.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

// ---------- Статистика ----------

adminApi.get('/stats', (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30
  const since = Date.now() - days * 864e5
  const prevSince = since - days * 864e5
  const one = (sql, ...a) => db.prepare(sql).get(...a)
  const all = (sql, ...a) => db.prepare(sql).all(...a)

  const totals = (from, to) => ({
    views: one("SELECT COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? AND created_at < ?", from, to).n,
    visitors: one("SELECT COUNT(DISTINCT vid) n FROM events WHERE type = 'pageview' AND created_at >= ? AND created_at < ?", from, to).n,
    bookings: one("SELECT COUNT(*) n FROM events WHERE type = 'booking' AND created_at >= ? AND created_at < ?", from, to).n,
    contacts: one("SELECT COUNT(*) n FROM events WHERE type IN ('telegram','whatsapp','max','phone') AND created_at >= ? AND created_at < ?", from, to).n,
    leads: one('SELECT COUNT(*) n FROM leads WHERE created_at >= ? AND created_at < ?', from, to).n,
  })

  const day = "date(created_at / 1000, 'unixepoch', 'localtime')"
  const rows = all(
    `SELECT ${day} d,
       SUM(type = 'pageview') views,
       COUNT(DISTINCT CASE WHEN type = 'pageview' THEN vid END) visitors,
       SUM(type = 'booking') bookings
     FROM events WHERE created_at >= ? GROUP BY d ORDER BY d`,
    since,
  )
  const byDay = new Map(rows.map((r) => [r.d, r]))
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const r = byDay.get(key)
    series.push({ date: key, views: r?.views || 0, visitors: r?.visitors || 0, bookings: r?.bookings || 0 })
  }

  res.json({
    days,
    totals: totals(since, Date.now() + 1),
    previous: totals(prevSince, since),
    series,
    topPages: all("SELECT path, COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? GROUP BY path ORDER BY n DESC LIMIT 8", since),
    bookingSources: all("SELECT COALESCE(label, path) label, COUNT(*) n FROM events WHERE type = 'booking' AND created_at >= ? GROUP BY 1 ORDER BY n DESC LIMIT 8", since),
    referrers: all("SELECT CASE WHEN referrer = '' OR referrer IS NULL THEN 'Прямые заходы' ELSE referrer END ref, COUNT(*) n FROM events WHERE type = 'pageview' AND created_at >= ? AND (referrer IS NOT NULL) GROUP BY 1 ORDER BY n DESC LIMIT 6", since),
    devices: all("SELECT device, COUNT(DISTINCT vid) n FROM events WHERE type = 'pageview' AND created_at >= ? GROUP BY device", since),
    contactsByType: all("SELECT type, COUNT(*) n FROM events WHERE type IN ('telegram','whatsapp','max','phone') AND created_at >= ? GROUP BY type", since),
    pending: {
      reviews: one("SELECT COUNT(*) n FROM reviews WHERE status = 'pending'").n,
      leads: one("SELECT COUNT(*) n FROM leads WHERE status = 'new'").n,
    },
  })
})

adminApi.delete('/stats', (req, res) => {
  db.exec('DELETE FROM events')
  res.json({ ok: true })
})

// ---------- Загрузка изображений ----------

// Фото из админки сразу сжимаем: WebP 1600 px (+ копия 640 px для телефонов), без потери чёткости
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|gif|heic|heif)$/.test(file.mimetype)),
})

adminApi.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Загрузите изображение JPG, PNG, WebP или AVIF до 25 МБ' })
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`
  try {
    const base = sharp(req.file.buffer, { failOn: 'none' }).rotate()
    for (const w of [1600, 640]) {
      await base.clone()
        .resize(w, w, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5, smartSubsample: true })
        .toFile(join(UPLOAD_DIR, `${id}-${w}.webp`))
    }
  } catch {
    return res.status(400).json({ error: 'Не удалось обработать изображение — попробуйте другой файл' })
  }
  res.status(201).json({ url: `/uploads/${id}-1600.webp` })
})
