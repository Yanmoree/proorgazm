import express from 'express'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicApi } from './routes/public.js'
import { adminApi, UPLOAD_DIR } from './routes/admin.js'
import { usingDefaultCredentials } from './auth.js'
import { legacyRedirect } from '../src/lib/routes.js'
import { startRatingRefresh } from './dikidi.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const PORT = Number(process.env.API_PORT) || 3001

mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))
app.use('/api/track', express.text({ limit: '10kb' }))

// Фронтенд на другом домене (например, Surge): CORS_ORIGIN=https://proorgazm.surge.sh,https://proorgazm.ru
const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
if (origins.length) {
  app.use(['/api', '/uploads'], (req, res, next) => {
    const origin = req.get('origin')
    if (origin && origins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
      res.set('Vary', 'Origin')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.set('Access-Control-Max-Age', '86400')
    }
    if (req.method === 'OPTIONS') return res.status(204).end()
    next()
  })
}

app.use('/api', publicApi)
app.use('/api/admin', adminApi)
app.use('/api', (req, res) => res.status(404).json({ error: 'Не найдено' }))
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }))

// В продакшене сервер сам отдаёт собранный фронтенд
// Старые русские адреса → новые английские (301, чтобы поисковики перенесли позиции)
app.get('*', (req, res, next) => {
  const to = req.path.startsWith('/api') || req.path.startsWith('/uploads') ? null : legacyRedirect(req.path)
  if (!to) return next()
  const q = req.originalUrl.indexOf('?')
  res.redirect(301, to.includes('?') ? to : to + (q >= 0 ? req.originalUrl.slice(q) : ''))
})

if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('*', (req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Ошибка сервера' })
})

startRatingRefresh()

app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}`)
  if (origins.length) console.log(`CORS: ${origins.join(', ')}`)
  if (usingDefaultCredentials) console.log('Админка: пароль из server/auth.js (хеш). Сменить — переменной ADMIN_PASS_HASH на сервере')
})
