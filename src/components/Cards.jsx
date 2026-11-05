import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Photo from './Photo.jsx'
import TiltCard from './TiltCard.jsx'
import { item } from './Reveal.jsx'
import { formatDate } from '../lib/content.jsx'

export function MassageCard({ m, index }) {
  return (
    <motion.div variants={item}>
      <TiltCard className="m-card glass">
        <div className="m-card__top">
          <span className="m-card__num display">0{index + 1}</span>
          {m.tag && <span className="chip chip--solid">{m.tag}</span>}
        </div>
        {m.titleFirst ? (
          <>
            <h3 className="m-card__title">{m.title}</h3>
            <div className="m-card__dur">{m.duration}</div>
          </>
        ) : (
          <>
            <div className="m-card__dur-big display">{m.duration}</div>
            <h3 className="display h3">{m.title}</h3>
          </>
        )}
        <p className="muted m-card__text">{m.short}</p>
        <div className="m-card__foot">
          <span className="m-card__price">{m.price}</span>
          <div className="m-card__btns">
            <Link to={`/massages/${m.slug}`} className="btn btn--ghost btn--sm">Подробнее</Link>
            <a href={m.booking} target="_blank" rel="noreferrer" data-track={m.title} className="btn btn--primary btn--sm">Записаться</a>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}

export function MasterCard({ m }) {
  return (
    <motion.div variants={item}>
      <Link to={`/masters/${m.slug}`} className="master-card">
        <div className="master-card__img">
          <Photo src={m.image || m.gallery?.[0]} alt={m.name} label="Фото мастера" ratio="3 / 4" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
          <span className="master-card__exp chip">Опыт {m.exp}</span>
        </div>
        <div className="master-card__body">
          <div>
            <h3 className="display h3">{m.name}</h3>
            <span className="muted">{m.role}</span>
          </div>
          <span className="master-card__arrow">↗</span>
        </div>
      </Link>
    </motion.div>
  )
}

export function ReviewCard({ r }) {
  return (
    <motion.article variants={item} className="review-card glass">
      <div className="review-card__stars" aria-label={`${r.rating || 5} из 5`}>{'★'.repeat(r.rating || 5)}</div>
      <p className="review-card__text">«{r.text}»</p>
      <div className="review-card__foot">
        <span className="review-card__avatar">{r.name[0]}</span>
        <div>
          <strong>{r.name}</strong>
          <small className="muted">{r.date || formatDate(r.created_at)}{r.master && ` · мастер ${r.master}`}</small>
        </div>
      </div>
    </motion.article>
  )
}

export function ArticleCard({ a, big }) {
  return (
    <motion.div variants={item} className={big ? 'article-card--big' : ''}>
      <Link to={`/blog/${a.slug}`} className="article-card">
        <Photo src={a.image} alt={a.title} label="Обложка" ratio={big ? '16 / 10' : '16 / 11'} className="article-card__img" />
        <div className="article-card__meta">
          <span className="chip">{a.category}</span>
          <span className="muted">{a.read} чтения</span>
        </div>
        <h3 className="display article-card__title">{a.title}</h3>
        <span className="article-card__more">Читать статью <span className="arrow">→</span></span>
      </Link>
    </motion.div>
  )
}
