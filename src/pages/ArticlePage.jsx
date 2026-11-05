import { useParams, Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import Photo from '../components/Photo.jsx'
import { Stagger } from '../components/Reveal.jsx'
import { ArticleCard } from '../components/Cards.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { useSite, useArticle } from '../lib/content.jsx'
import RichText from '../components/RichText.jsx'
import NotFound from './NotFound.jsx'

export default function ArticlePage() {
  const { slug } = useParams()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 })
  const { articles } = useSite()
  const { article: a, loading, missing } = useArticle(slug)
  if (missing || (!a && !loading)) return <NotFound />
  if (!a) return <div className="article__head container article__loading">Загрузка…</div>
  const related = articles.filter((x) => x.slug !== slug).slice(0, 3)

  return (
    <>
      <motion.div className="read-progress" style={{ scaleX: progress }} />
      <article className="article">
        <header className="article__head container">
          <nav className="crumbs">
            <Link to="/">Главная</Link><span><i>/</i><Link to="/blog">Блог</Link></span>
          </nav>
          <div className="article-card__meta">
            <span className="chip">{a.category}</span>
            <span className="muted">{[a.date, a.read && `${a.read} чтения`].filter(Boolean).join(' · ')}</span>
          </div>
          <motion.h1
            className="display h1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {a.title}
          </motion.h1>
        </header>
        <div className="container">
          <Photo src={a.image} alt={a.title} label="Обложка статьи" ratio="21 / 9" className="article__cover" />
        </div>
        <div className="container article__body">
          {a.body ? <RichText text={a.body} /> : <p className="article__loading">Загрузка…</p>}
          <div className="article__share">
            <span className="muted">Поделиться:</span>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(location.href)}`} target="_blank" rel="noreferrer" className="chip">Telegram</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(location.href)}`} target="_blank" rel="noreferrer" className="chip">WhatsApp</a>
          </div>
        </div>
      </article>
      <section className="section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Читайте также</span><h2 className="display h2">Похожие <span className="gradient-text italic">статьи</span></h2></div></div>
          <Stagger className="grid grid-3">
            {related.map((r) => <ArticleCard key={r.slug} a={r} />)}
          </Stagger>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
