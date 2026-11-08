import PageHero from '../components/PageHero.jsx'
import Reveal, { Stagger } from '../components/Reveal.jsx'
import { ReviewCard } from '../components/Cards.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { ReviewForm } from '../components/Forms.jsx'
import Stars from '../components/Stars.jsx'
import { useSite, ratingsLabel } from '../lib/content.jsx'
import { useSeo, pageSeo, itemSeo } from '../lib/seo.js'

export default function Reviews() {
  const { DIKIDI_REVIEWS, reviews, masters, ratings, rating, settings } = useSite()
  useSeo(pageSeo('reviews', settings))
  return (
    <>
      <PageHero
        eyebrow="Отзывы"
        title="Что говорят"
        accent="наши гостьи"
        text="Все отзывы проходят модерацию перед публикацией. Мы ценим каждое мнение и становимся лучше благодаря вам."
        crumbs={[{ label: 'Отзывы' }]}
      >
        <div className="rating glass">
          <strong className="rating__value display gradient-text">{rating.toFixed(1)}</strong>
          <div className="rating__meta">
            <Stars value={rating} size={20} />
            <span className="muted">{ratingsLabel(ratings)}</span>
          </div>
          <a href={DIKIDI_REVIEWS} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Отзывы в DIKIDI ↗</a>
        </div>
      </PageHero>

      <section className="section--tight">
        <div className="container">
          <Stagger className="grid grid-3 reviews-grid">
            {reviews.map((r, i) => <ReviewCard key={r.id || i} r={r} />)}
          </Stagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="review-form glass">
            <div>
              <span className="eyebrow">Ваше мнение</span>
              <h2 className="display h2">Оставить <span className="gradient-text italic">отзыв</span></h2>
              <p className="muted">Отзыв появится на сайте после модерации. Можно подписаться только именем.</p>
            </div>
            <ReviewForm masters={masters} />
          </Reveal>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
