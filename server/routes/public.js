import { Router } from 'express'
import { db, listItems, getItem, getSettings } from '../db.js'
import { rateLimit, str } from '../util.js'
import { getRatingStats } from '../dikidi.js'

export const publicApi = Router()

const approvedReviews = () =>
  db.prepare("SELECT id, name, master, text, rating, created_at FROM reviews WHERE status = 'approved' ORDER BY created_at DESC").all()

publicApi.get('/content', (req, res) => {
  res.json({
    settings: getSettings(),
    massages: listItems('massages'),
    masters: listItems('masters'),
    articles: listItems('articles').map(({ body, ...a }) => a),
    reviews: approvedReviews(),
    ratings: getRatingStats()?.ratings ?? null,
    rating: getRatingStats()?.rating ?? null,
  })
})

publicApi.get('/articles/:slug', (req, res) => {
  const a = getItem('articles', req.params.slug)
  if (!a) return res.status(404).json({ error: 'Статья не найдена' })
  res.json(a)
})

publicApi.post('/reviews', rateLimit('review', 3, 3600e3), (req, res) => {
  const name = str(req.body.name, 60)
  const text = str(req.body.text, 2000)
  const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5))
  if (name.length < 2 || text.length < 10) return res.status(400).json({ error: 'Укажите имя и текст отзыва (от 10 символов)' })
  db.prepare('INSERT INTO reviews (name, master, text, rating, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    name, str(req.body.master, 60) || null, text, rating, 'pending', Date.now(),
  )
  res.status(201).json({ ok: true })
})

publicApi.post('/leads', rateLimit('lead', 5, 3600e3), (req, res) => {
  const name = str(req.body.name, 60)
  const phone = str(req.body.phone, 30)
  if (name.length < 2 || phone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Укажите имя и корректный телефон' })
  if (!req.body.consent) return res.status(400).json({ error: 'Нужно согласие на обработку данных' })
  db.prepare('INSERT INTO leads (name, phone, message, source, created_at) VALUES (?, ?, ?, ?, ?)').run(
    name, phone, str(req.body.message, 2000), str(req.body.source, 100), Date.now(),
  )
  res.status(201).json({ ok: true })
})

const EVENT_TYPES = new Set(['pageview', 'booking', 'telegram', 'whatsapp', 'max', 'phone'])
const BOT = /bot|crawl|spider|slurp|headless|lighthouse/i

publicApi.post('/track', rateLimit('track', 300, 600e3), (req, res) => {
  if (typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body) } catch { return res.status(204).end() }
  }
  const ua = req.get('user-agent') || ''
  const type = str(req.body.type, 20)
  if (!EVENT_TYPES.has(type) || BOT.test(ua)) return res.status(204).end()
  let referrer = ''
  try {
    const host = new URL(str(req.body.ref, 500)).hostname.replace(/^www\./, '')
    if (host && host !== req.hostname) referrer = host
  } catch { /* нет реферера */ }
  db.prepare('INSERT INTO events (type, path, label, vid, device, referrer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    type,
    str(req.body.path, 200),
    str(req.body.label, 120) || null,
    str(req.body.vid, 64),
    /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop',
    referrer,
    Date.now(),
  )
  res.status(204).end()
})
