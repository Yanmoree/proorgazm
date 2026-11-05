import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

// Логин админки — admin (или ADMIN_USER). Пароль в коде хранится только как хеш scrypt,
// сам пароль в репозитории не лежит. ADMIN_PASS на сервере, если задан, заменяет его.
// Новый хеш: node scripts/hash-password.mjs 'новый-пароль'
const USER = process.env.ADMIN_USER || 'admin'
const PASS_HASH = process.env.ADMIN_PASS_HASH || 'scrypt$32768$8$1$zYZFA2k6dp+Wr9cOtiucKg==$eRTc0mygCq00yyZzptJUJXJWhvH+bwYwOf704SlGMceZVVRRnJT7LU2a+P4uFi7MhwvdtP/WAJdbOzmvuFpz2A=='
const TTL = 7 * 864e5

export const usingDefaultCredentials = !process.env.ADMIN_PASS && !process.env.ADMIN_PASS_HASH

const same = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

function checkPassword(pass) {
  if (process.env.ADMIN_PASS) return same(pass, process.env.ADMIN_PASS)
  const [algo, N, r, p, salt, hash] = PASS_HASH.split('$')
  if (algo !== 'scrypt') return false
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(String(pass), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  })
  return timingSafeEqual(actual, expected)
}

// Пароль сменился — выходим из всех старых сессий
const fingerprint = createHash('sha256').update(`${USER}:${process.env.ADMIN_PASS || PASS_HASH}`).digest('hex')
if (db.prepare("SELECT value FROM meta WHERE key = 'auth'").get()?.value !== fingerprint) {
  db.exec('DELETE FROM sessions')
  db.prepare("INSERT INTO meta (key, value) VALUES ('auth', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(fingerprint)
}

export function login(user, pass) {
  // Проверяем пароль и при неверном логине, чтобы время ответа не выдавало, какой из них неверен
  const passOk = checkPassword(pass)
  if (!same(user, USER) || !passOk) return null
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sessions (token, created_at) VALUES (?, ?)').run(token, Date.now())
  db.prepare('DELETE FROM sessions WHERE created_at < ?').run(Date.now() - TTL)
  return token
}

export function logout(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function requireAdmin(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const row = token && db.prepare('SELECT created_at FROM sessions WHERE token = ?').get(token)
  if (!row || Date.now() - row.created_at > TTL) return res.status(401).json({ error: 'Требуется вход' })
  req.token = token
  next()
}
