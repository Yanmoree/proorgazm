import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import defaults from './seo-defaults.json'

// Title и description страниц. Порядок: поле из админки → шаблон по умолчанию (seo-defaults.json).
// Ту же логику повторяет php/page.php, чтобы поисковик получал правильные теги ещё до запуска JS.

const strip = (s = '') => String(s).replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim()

// Обрезка описания до ~160 символов по границе слова
export function clip(text, max = 160) {
  const s = strip(text)
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,.;:—-]+$/, '')}…`
}

const fill = (tpl, data) => tpl.replace(/\{(\w+)\}/g, (_, k) => strip(data?.[k] ?? ''))

// Статическая страница: key — home, massages, masters, blog, reviews, contacts, privacy, notFound
export function pageSeo(key, settings = {}, page = 1) {
  const d = defaults.pages[key]
  const own = key === 'home' ? settings.seo || {} : {
    title: settings.seoPages?.[`${key}Title`],
    description: settings.seoPages?.[`${key}Description`],
  }
  const suffix = page > 1 ? fill(defaults.pageSuffix, { n: page }) : ''
  return { title: (strip(own.title) || d.title) + suffix, description: clip(own.description || d.description) }
}

// Страница записи: collection — massages, masters, articles
export function itemSeo(collection, item) {
  const d = defaults.items[collection]
  return {
    title: strip(item?.seoTitle) || fill(d.title, item).replace(/\s+/g, ' ').trim(),
    description: clip(item?.seoDescription || fill(d.description, item)),
  }
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// Канонический адрес — сама страница: без хвостового слеша и лишних параметров
export function canonicalUrl(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/'
  const keep = new URLSearchParams()
  const q = new URLSearchParams(search)
  for (const k of ['category', 'page']) if (q.get(k)) keep.set(k, q.get(k))
  const qs = keep.toString()
  return `${window.location.origin.replace('://www.', '://')}${path}${qs ? `?${qs}` : ''}`
}

export function useSeo({ title, description, noindex = false }) {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (!title) return
    document.title = title
    const url = canonicalUrl(pathname, search)
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : null)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', defaults.site)
    let link = document.head.querySelector('link[rel="canonical"]')
    if (noindex) { link?.remove(); return }
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url
  }, [title, description, noindex, pathname, search])
}
