// Переносит статьи с proorgazm.ru в новый сайт.
// Результат: public/content/articles/<slug>.json (полный текст), src/data/articles.js (список)
// и обложки public/images/blog/<slug>-{640,1200}.webp. Запуск: npm run import:articles
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SLUG_RENAMES, legacyRedirect } from '../src/lib/routes.js'

const ORIGIN = 'https://proorgazm.ru'
const OUT_JSON = 'public/content/articles'
const OUT_IMG = 'public/images/blog'
mkdirSync(OUT_JSON, { recursive: true })
mkdirSync(OUT_IMG, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, as = 'text') {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ProOrgazm site migration' } })
      if (!res.ok) throw new Error(`${res.status} ${url}`)
      return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text()
    } catch (e) {
      if (i === 2) throw e
      await sleep(1000 * (i + 1))
    }
  }
}

// ---------- HTML → мини-разметка сайта (## заголовок, - список, > цитата, [текст](ссылка)) ----------

const ENTITIES = { nbsp: ' ', mdash: '—', ndash: '–', laquo: '«', raquo: '»', quot: '"', amp: '&', lt: '<', gt: '>', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', apos: "'" }
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)

const clean = (s) => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

// Страницы оригинала, которых нет на новом сайте
const EXTRA_LINKS = { '/massazh-dlya-par': '/massages/massage-for-wife-with-husband', '/tovary': null }

// Внутренние ссылки сразу переписываем на новые адреса
function rewriteLink(url) {
  if (!url.startsWith('/')) return url
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (path in EXTRA_LINKS) return EXTRA_LINKS[path]
  return legacyRedirect(path) || path
}

// Ссылки сохраняем как [текст](адрес)
const inline = (html) =>
  clean(
    html.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const t = clean(text)
      if (!t) return ''
      let url = decode(href).trim()
      if (url.startsWith(ORIGIN)) url = url.slice(ORIGIN.length) || '/'
      if (!/^(https?:\/\/|\/)/.test(url)) return t
      url = rewriteLink(url)
      return url ? `[${t}](${url})` : t
    }),
  )

function toMarkup(html) {
  const blocks = []
  const re = /<(h[1-6]|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase()
    if (tag === 'ul' || tag === 'ol') {
      const items = [...m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => inline(x[1])).filter(Boolean)
      if (items.length) blocks.push(items.map((x) => `- ${x}`).join('\n'))
    } else {
      const text = inline(m[2])
      if (!text) continue
      if (tag.startsWith('h')) blocks.push(`## ${text}`)
      else if (tag === 'blockquote') blocks.push(`> ${text}`)
      else blocks.push(text)
    }
  }
  return blocks.join('\n\n')
}

// Содержимое <div class="…__text"> с учётом вложенных div
function innerDiv(html, marker) {
  const start = html.indexOf(marker)
  if (start < 0) return ''
  const open = html.indexOf('>', start) + 1
  const re = /<\/?div\b[^>]*>/gi
  re.lastIndex = open
  let depth = 1
  let m
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1
    if (depth === 0) return html.slice(open, m.index)
  }
  return html.slice(open)
}

const CATEGORIES = [
  ['Интимные товары', /вибратор/i],
  ['Отношения', /партн|пар\b|пары|для пар|свинг|знакомств|секс\b|лучше секса/i],
  ['Психология', /эмоци|комплекс|самооценк|любв|любви к себе|интерес к жизни|стесн|подавлен/i],
  ['Здоровье', /польз|стресс|либидо|продуктивн|перезагруз|плюсы/i],
]
const categoryOf = (title) => CATEGORIES.find(([, re]) => re.test(title))?.[0] || 'Массаж'

const readTime = (text) => `${Math.max(2, Math.round(text.split(/\s+/).length / 180))} мин`

// ---------- обход ----------

const listPages = [`${ORIGIN}/stati`]
const seen = new Set(listPages)
const items = []
for (let i = 0; i < listPages.length; i++) {
  const html = await get(listPages[i])
  for (const [, href] of html.matchAll(/href="(\/stati\/p\/\d+)"/g)) {
    const url = ORIGIN + href
    if (!seen.has(url)) { seen.add(url); listPages.push(url) }
  }
  for (const [, block] of html.matchAll(/<article class="g-article[^"]*">([\s\S]*?)<\/article>/g)) {
    const href = block.match(/class="g-article__name" href="([^"]+)"/)?.[1]
    if (!href || items.some((x) => x.href === href)) continue
    items.push({
      href,
      title: clean(block.match(/class="g-article__name"[^>]*>([\s\S]*?)<\/a>/)?.[1] || ''),
      thumb: block.match(/<img[^>]+src="([^"]+)"/)?.[1] || '',
      excerpt: clean(block.match(/class="g-article__text">([\s\S]*?)<\/div>/)?.[1] || ''),
    })
  }
  await sleep(300)
}
console.log(`Найдено статей: ${items.length}`)

const list = []
for (const [i, it] of items.entries()) {
  const oldSlug = it.href.split('/').filter(Boolean).pop()
  const slug = SLUG_RENAMES.articles[oldSlug]
  if (!slug) {
    console.warn(`  пропуск: нет английского адреса для «${oldSlug}» (добавьте в src/lib/routes.js)`)
    continue
  }
  const html = await get(ORIGIN + it.href)
  const title = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || it.title)
  const body = toMarkup(innerDiv(html, 'class="g-page-article__text"'))
  const seoDescription = decode(html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] || '')
  const rawExcerpt = (it.excerpt || seoDescription).replace(/\s*(\.{3}|…)$/, '')
  const excerpt = rawExcerpt.length > 260 ? `${rawExcerpt.slice(0, 260).replace(/\s+\S*$/, '')}…` : rawExcerpt

  // Обложка: превью /thumb/…/d/file.png → оригинал /d/file.png, сжимаем в WebP
  let image = ''
  const file = it.thumb.match(/\/d\/([^/?#]+)$/)?.[1]
  if (file) {
    try {
      const buf = await get(`${ORIGIN}/d/${file}`, 'buffer')
      for (const w of [640, 1200]) {
        await sharp(buf).rotate().resize(w, Math.round(w / 1.6), { fit: 'cover', position: sharp.strategy.attention })
          .webp({ quality: 80, effort: 6 }).toFile(join(OUT_IMG, `${slug}-${w}.webp`))
      }
      image = `/images/blog/${slug}-1200.webp`
    } catch (e) {
      console.warn(`  обложка не загрузилась (${slug}): ${e.message}`)
    }
  }

  const meta = { slug, title, category: categoryOf(title), read: readTime(body), date: '', excerpt, image, sort: i }
  list.push(meta)
  writeFileSync(join(OUT_JSON, `${slug}.json`), JSON.stringify({ ...meta, body }, null, 1))
  console.log(`  ✓ ${slug} — ${body.length} симв.${image ? ', обложка' : ''}`)
  await sleep(300)
}

writeFileSync('src/data/articles.js', `// Создано scripts/import-articles.mjs — список статей (полный текст в public/content/articles)\nexport default ${JSON.stringify(list, null, 1)}\n`)
console.log(`Готово: ${list.length} статей`)
