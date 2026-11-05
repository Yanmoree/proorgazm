import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Reveal, { Stagger } from '../components/Reveal.jsx'
import Gallery from '../components/Gallery.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { MasterCard, ReviewCard, MassageCard } from '../components/Cards.jsx'
import PageHero from '../components/PageHero.jsx'
import { useSite } from '../lib/content.jsx'
import NotFound from './NotFound.jsx'
import RichText from '../components/RichText.jsx'
import Faq from '../components/Faq.jsx'

export default function MasterPage() {
  const { masters, reviews, massages } = useSite()
  const { slug } = useParams()
  const m = masters.find((x) => x.slug === slug)
  if (!m) return <NotFound />
  const first = m.name.split(' ')[0]
  const myReviews = reviews.filter((r) => r.master === first)
  const others = masters.filter((x) => x.slug !== slug)
  const programs = massages.filter((p) => (m.programs?.length ? m.programs.includes(p.slug) : true))
  const images = [m.image, ...(m.gallery || [])]
  const params = [['Опыт', m.exp], ['Возраст', m.age], ['Рост', m.height], ['Вес', m.weight]].filter(([, v]) => v)

  return (
    <>
      <PageHero eyebrow={m.role} title={m.name} crumbs={[{ label: 'Мастера', to: '/masters' }, { label: m.name }]} />

      <section className="section--tight">
        <div className="container master-page">
          <motion.div
            className="master-page__photo"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Gallery images={images} alt={m.name} />
          </motion.div>

          <div className="master-page__info">
            <div className="master-page__stats">
              {params.map(([k, v]) => <div key={k} className="glass"><small>{k}</small><strong className="display">{v}</strong></div>)}
            </div>
            <div className="master-page__traits">
              {(m.traits || []).map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
            <Reveal className="rich">
              <RichText text={m.bio || ''} />
            </Reveal>
            <a href={m.booking} target="_blank" rel="noreferrer" data-track={m.name} className="btn btn--primary">
              Записаться к мастеру <span className="arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {programs.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head"><div><span className="eyebrow">Программы</span><h2 className="display h2">Программы <span className="gradient-text italic">мастера</span></h2></div></div>
            <Stagger className="grid grid-3">
              {programs.map((p) => <MassageCard key={p.slug} m={p} index={massages.indexOf(p)} />)}
            </Stagger>
          </div>
        </section>
      )}

      {myReviews.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head"><div><span className="eyebrow">Отзывы</span><h2 className="display h2">О мастере</h2></div></div>
            <Stagger className="grid grid-3">
              {myReviews.map((r) => <ReviewCard key={r.name} r={r} />)}
            </Stagger>
          </div>
        </section>
      )}

      <Faq items={m.faq} title="Вопросы о" accent="мастере" />

      <section className="section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Команда</span><h2 className="display h2">Другие <span className="gradient-text italic">мастера</span></h2></div></div>
          <Stagger className="grid grid-3">
            {others.map((o) => <MasterCard key={o.slug} m={o} />)}
          </Stagger>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
