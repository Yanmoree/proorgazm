import { db } from './db.js'

// Настоящие средний балл и число оценок салона со страницы отзывов DIKIDI. Обновляем при запуске и раз в 6 часов,
// последнее удачное значение храним в базе — если DIKIDI недоступен, показываем его.
const COMPANY = '536831'
const URL = `https://dikidi.net/${COMPANY}?p=1.pi-pr`
const EVERY = 6 * 3600e3

const KEY = 'dikidi'
const read = () => {
  const row = db.prepare('SELECT data FROM settings WHERE key = ?').get(KEY)
  return row ? JSON.parse(row.data) : null
}

export const getRatingStats = () => read()

export async function refreshRatingStats() {
  try {
    const res = await fetch(URL, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ProOrgazmSite/1.0)', 'accept-language': 'ru,en;q=0.8' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // Разметка приходит внутри JSON-строки (кириллица — как \uXXXX): раскодируем и ищем «18 оценок» / «18 ratings»
    const text = (await res.text())
      .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\\//g, '/')
      .replace(/\\n/g, ' ')
      .replace(/<[^>]+>/g, ' ')
    const ratings = Number(text.match(/(\d+)\s+(?:ratings?|оцен\S*)/i)?.[1])
    if (!Number.isFinite(ratings) || ratings <= 0) throw new Error('число оценок не найдено')
    // «4.8 /5»
    const rating = Number(text.match(/(\d(?:[.,]\d)?)\s*\/\s*5\b/)?.[1]?.replace(',', '.'))
    const data = { ratings, rating: rating >= 1 && rating <= 5 ? rating : null, updatedAt: Date.now() }
    db.prepare('INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data').run(KEY, JSON.stringify(data))
    return data
  } catch (e) {
    console.warn(`DIKIDI: не удалось обновить число оценок (${e.message}), оставляем прежнее`)
    return read()
  }
}

export function startRatingRefresh() {
  refreshRatingStats()
  setInterval(refreshRatingStats, EVERY).unref()
}
