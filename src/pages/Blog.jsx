import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import { Stagger } from '../components/Reveal.jsx'
import { ArticleCard } from '../components/Cards.jsx'
import Faq from '../components/Faq.jsx'
import { useSite } from '../lib/content.jsx'
import { scrollToTop } from '../lib/smooth.js'
import { useSeo, pageSeo } from '../lib/seo.js'

const PER_PAGE = 9

export default function Blog() {
  const { articles, faq, settings } = useSite()
  const [params, setParams] = useSearchParams()
  const cats = ['Все', ...new Set(articles.map((a) => a.category))]
  const cat = cats.includes(params.get('category')) ? params.get('category') : 'Все'
  const list = cat === 'Все' ? articles : articles.filter((a) => a.category === cat)
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1))
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const seo = pageSeo('blog', settings, page)
  useSeo(cat === 'Все' ? seo : { ...seo, title: `${cat} — ${seo.title}` })

  // Ссылка на страницу N с сохранением рубрики; первая страница — без ?page
  const href = (n) => {
    const q = new URLSearchParams()
    if (cat !== 'Все') q.set('category', cat)
    if (n > 1) q.set('page', String(n))
    const str = q.toString()
    return `/blog${str ? `?${str}` : ''}`
  }
  const setCat = (c) => setParams(c === 'Все' ? {} : { category: c })

  useEffect(() => { scrollToTop() }, [page, cat])

  return (
    <>
      <PageHero
        eyebrow="Блог"
        title="Статьи о"
        accent="себе и теле"
        text="Психология, отношения, здоровье и забота о себе — читайте, вдохновляйтесь, открывайте новое."
        crumbs={[{ label: 'Блог' }]}
      >
        <div className="filters">
          {cats.map((c) => (
            <button key={c} className={`filter ${c === cat ? 'is-active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </PageHero>
      <section className="section--tight">
        <div className="container">
          <Stagger key={`${cat}-${page}`} className="blog-grid">
            {shown.map((a) => <ArticleCard key={a.slug} a={a} />)}
          </Stagger>
          {pages > 1 && (
            <nav className="pagination" aria-label="Страницы блога">
              {page > 1 ? <Link to={href(page - 1)} aria-label="Предыдущая страница">←</Link> : <span className="is-disabled" aria-hidden="true">←</span>}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
                n === page
                  ? <span key={n} className="is-active" aria-current="page">{n}</span>
                  : <Link key={n} to={href(n)}>{n}</Link>,
              )}
              {page < pages ? <Link to={href(page + 1)} aria-label="Следующая страница">→</Link> : <span className="is-disabled" aria-hidden="true">→</span>}
            </nav>
          )}
        </div>
      </section>
      <Faq items={faq.blog} />
    </>
  )
}
