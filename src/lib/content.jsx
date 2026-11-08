import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'
import * as seed from '../data/site.js'

// Пока API не ответил (или недоступен) — показываем встроенный контент
const fallback = {
  settings: {
    contacts: seed.contacts,
    links: { booking: seed.DIKIDI, reviews: seed.DIKIDI_REVIEWS, consult: seed.DIKIDI_CONSULT, training: seed.DIKIDI_TRAINING },
    photos: seed.photos,
    faq: seed.pageFaq,
    hero: {
      eyebrow: 'Салон эротического массажа для женщин в Москве',
      title: 'Ваше удовольствие',
      accent: 'в наших руках',
      subtitle: 'Добро пожаловать в мир настоящего расслабления. Гарантируем качество, конфиденциальность и безопасность — 24/7.',
    },
  },
  massages: seed.massages,
  masters: seed.masters,
  articles: seed.articles,
  reviews: seed.reviews,
}

const Ctx = createContext(fallback)

export function ContentProvider({ children }) {
  const [content, setContent] = useState(fallback)

  useEffect(() => {
    api('/content')
      .then((c) => {
        setContent(c)
      })
      .catch(() => { /* остаёмся на встроенном контенте */ })
  }, [])

  return <Ctx.Provider value={content}>{children}</Ctx.Provider>
}

export function useSite() {
  const c = useContext(Ctx)
  const s = { ...fallback.settings, ...c.settings }
  return {
    ...c,
    settings: s,
    contacts: { ...fallback.settings.contacts, ...s.contacts },
    hero: { ...fallback.settings.hero, ...s.hero },
    photos: { ...seed.photos, ...s.photos },
    faq: { ...seed.pageFaq, ...s.faq },
    DIKIDI: s.links?.booking || seed.DIKIDI,
    DIKIDI_REVIEWS: s.links?.reviews || seed.DIKIDI_REVIEWS,
    DIKIDI_CONSULT: s.links?.consult || seed.DIKIDI_CONSULT,
    DIKIDI_TRAINING: s.links?.training || seed.DIKIDI_TRAINING,
    ratings: c.ratings || seed.RATINGS_COUNT,
    rating: c.rating || seed.RATING_VALUE,
  }
}

export function useArticle(slug) {
  const { articles } = useSite()
  const [state, setState] = useState({ slug: null, article: null, error: false })

  useEffect(() => {
    let alive = true
    // Без API (статический хостинг) берём полный текст из public/content/articles
    const fromStatic = () =>
      fetch(`/content/articles/${encodeURIComponent(slug)}.json`).then((r) => {
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('not found')
        return r.json()
      })
    api(`/articles/${slug}`)
      .catch((e) => (e.offline ? fromStatic() : Promise.reject(e)))
      .then((a) => alive && setState({ slug, article: a, error: false }))
      .catch(() => alive && setState({ slug, article: null, error: true }))
    return () => { alive = false }
  }, [slug])

  const listed = articles.find((a) => a.slug === slug)
  if (state.slug === slug && state.article) return { article: state.article, loading: false }
  return { article: listed || null, loading: state.slug !== slug, missing: state.slug === slug && state.error && !listed }
}

// 1 оценка, 2 оценки, 5 оценок
export const ratingsLabel = (n) => {
  const m10 = n % 10, m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? 'оценка' : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'оценки' : 'оценок'
  return `${n} ${word}`
}

export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
