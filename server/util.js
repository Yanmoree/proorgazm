// Простой лимит запросов в памяти: не больше `max` за `windowMs` с одного IP на ключ
const hits = new Map()

export function rateLimit(key, max, windowMs) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`
    const now = Date.now()
    const list = (hits.get(id) || []).filter((t) => now - t < windowMs)
    if (list.length >= max) return res.status(429).json({ error: 'Слишком много запросов, попробуйте позже' })
    list.push(now)
    hits.set(id, list)
    next()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [k, list] of hits) if (!list.some((t) => now - t < 3600e3)) hits.delete(k)
}, 600e3).unref()

export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const slugify = (s) =>
  str(s, 120)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/[а-яё]/g, (c) => ({ а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' })[c])
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
