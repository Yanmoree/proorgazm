import { Fragment, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { whenLoaderDone } from '../lib/loader.js'
import Reveal, { Stagger } from '../components/Reveal.jsx'
import Photo from '../components/Photo.jsx'
import Stars from '../components/Stars.jsx'
import Marquee from '../components/Marquee.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { MassageCard, MasterCard, ReviewCard, ArticleCard } from '../components/Cards.jsx'
import { useSite, ratingsLabel } from '../lib/content.jsx'
import { features } from '../data/site.js'
import { useSeo, pageSeo, itemSeo } from '../lib/seo.js'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  { n: '01', title: 'Запись', text: 'Онлайн через DIKIDI или в мессенджере. Анонимно — достаточно имени.' },
  { n: '02', title: 'Знакомство', text: 'Чай, беседа с мастером, обсуждение пожеланий и границ.' },
  { n: '03', title: 'Релаксация', text: 'Мягкий массаж всего тела, ароматы, приглушённый свет и музыка.' },
  { n: '04', title: 'Погружение', text: 'Основная часть программы в вашем темпе и по вашим правилам.' },
  { n: '05', title: 'Восстановление', text: 'Спокойное завершение, душ и время побыть наедине с собой.' },
]

const perks = [
  { big: '5%', title: 'Кэшбэк и скидка за рекомендацию', text: 'Порекомендуйте нас подруге — вы получите 5% кэшбэка, а она 5% скидки на любой массаж.', cta: 'Записаться' },
  { big: '0 ₽', title: 'Бесплатный выезд', text: 'Выезд мастера к вам домой или в отель по Москве до 23:00 — бесплатно.', cta: 'Подробнее' },
  { big: '🎁', title: 'Подарочные сертификаты', text: 'Подарочный сертификат на любой массаж — для любимой, подруги или партнёра.', cta: 'Заказать' },
]

function SplitWords({ text, className }) {
  return text.split(' ').map((w, i) => (
    <Fragment key={i}>
      <span className="split-word">
        <span className={`split-inner ${className || ''}`}>{w}</span>
      </span>{' '}
    </Fragment>
  ))
}

export default function Home() {
  const { DIKIDI, DIKIDI_CONSULT, massages, masters, reviews, articles, hero, photos, contacts, ratings, rating, settings } = useSite()
  useSeo(pageSeo('home', settings))
  const place = `${contacts.address.replace(/^Москва,\s*/, '')} (${contacts.metro})`
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Первый экран раскрывается, когда растворяется экран загрузки
        const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
          .from('.hero .split-inner', { yPercent: 110, duration: 1.4, stagger: 0.07, delay: 0.1 })
          .from('.hero__sub, .hero__actions, .hero__meta', { y: 24, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.9')
          .from('.hero__visual', { scale: 0.92, opacity: 0, duration: 1.6 }, '<-0.6')
        whenLoaderDone().then(() => intro.play())

        gsap.to('.hero__visual', {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        })

        gsap.to('.about__img--2', {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: 1 },
        })

        gsap.from('.process__line-fill', {
          scaleX: 0,
          ease: 'none',
          scrollTrigger: { trigger: '.process__steps', start: 'top 75%', end: 'bottom 55%', scrub: 1 },
        })
      })
    },
    { scope: root },
  )

  return (
    <div ref={root}>
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg" aria-hidden="true">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
          <div className="hero__rings">
            <span /><span /><span />
          </div>
        </div>

        <div className="container hero__inner">
          <div className="hero__content">
            {/* H1 страницы — «Салон эротического массажа для женщин в Москве», слоган под ним — оформление */}
            <h1 className="eyebrow hero__meta hero__h1">{hero.eyebrow}</h1>
            <p className="display hero__title">
              <SplitWords text={hero.title} />
              <br />
              <SplitWords text={hero.accent} className="gradient-text italic" />
            </p>
            <p className="lead hero__sub">
              {hero.subtitle}
            </p>
            <div className="hero__actions">
              <a href={DIKIDI} target="_blank" rel="noreferrer" data-track="Главная · hero" className="btn btn--primary">
                Записаться онлайн <span className="arrow">→</span>
              </a>
              <Link to="/massages" className="btn btn--ghost">Выбрать программу</Link>
            </div>
            <div className="hero__stats hero__meta">
              <div><strong className="display">{massages.length}</strong><span>программ</span></div>
              <div><strong className="display">{masters.length}</strong><span>мастера</span></div>
              <div><strong className="display">24/7</strong><span>без выходных</span></div>
            </div>
          </div>

          <div className="hero__visual">
            <Photo src={photos.hero} alt="" priority sizes="(max-width: 960px) 90vw, 40vw" label="Главное фото" ratio="4 / 5" className="hero__photo" />
            <div className="hero__float hero__float--1 glass">
              <span className="hero__float-icon">◎</span>
              <div><strong>100% анонимно</strong><small>Данные не передаются</small></div>
            </div>
            <div className="hero__float hero__float--2 glass">
              <div className="hero__rating">
                <strong>{rating.toFixed(1)}</strong>
                <Stars value={rating} size={14} />
              </div>
              <small>{ratingsLabel(ratings)}</small>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={['Расслабление', 'Чувственность', 'Конфиденциальность', 'Забота', 'Новые ощущения', 'Гармония']} />

      {/* ПРЕИМУЩЕСТВА */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Почему ProOrgazm</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Пространство, где можно <span className="gradient-text italic">быть собой</span></h2></Reveal>
            </div>
          </div>
          <Stagger className="grid grid-3">
            {features.map((f) => (
              <Reveal key={f.title} className="feature glass">
                <span className="feature__icon">{f.icon}</span>
                <h3 className="feature__title">{f.title}</h3>
                <p className="muted">{f.text.replace('{place}', place)}</p>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ПРОГРАММЫ */}
      <section className="section programs">
        <div className="glow glow--violet" style={{ width: 700, height: 500, left: '-20%', top: '20%' }} />
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Программы</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">{massages.length} программ <span className="gradient-text italic">массажа</span></h2></Reveal>
            </div>
            <Reveal delay={0.2}><Link to="/massages" className="btn btn--ghost">Все программы <span className="arrow">→</span></Link></Reveal>
          </div>
          <Stagger className="grid grid-3">
            {massages.map((m, i) => <MassageCard key={m.slug} m={m} index={i} />)}
          </Stagger>
        </div>
      </section>

      {/* О САЛОНЕ */}
      <section className="section about">
        <div className="container about__grid">
          <div className="about__media">
            <Photo src={photos.about} alt="" label="Интерьер салона" ratio="4 / 5" className="about__img about__img--1" />
            <Photo src={photos.aboutSmall} alt="" sizes="(max-width: 860px) 45vw, 22vw" label="Атмосфера" ratio="1 / 1" className="about__img about__img--2" />
          </div>
          <div className="about__content">
            <Reveal><span className="eyebrow">О салоне</span></Reveal>
            <Reveal delay={0.1}><h2 className="display h2">Атмосфера <span className="gradient-text italic">полного доверия</span></h2></Reveal>
            <Reveal delay={0.2}>
              <p className="lead">
                Мы создали место, где женщина может отпустить контроль, снять напряжение и заново познакомиться со своим телом. Деликатно, бережно и без спешки.
              </p>
            </Reveal>
            <Stagger className="about__list">
              {['Комфортная температура и мягкий свет', 'Спокойная музыка и ароматерапия', 'Индивидуальная длительность сеанса', 'Отдельный вход и полная анонимность'].map((t) => (
                <Reveal key={t} className="about__li"><span>✦</span>{t}</Reveal>
              ))}
            </Stagger>
            <Reveal delay={0.3}>
              <a href={DIKIDI_CONSULT} target="_blank" rel="noreferrer" className="btn btn--ghost">Бесплатная консультация</a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* КАК ПРОХОДИТ */}
      <section className="section process">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Как проходит сеанс</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Пять шагов к <span className="gradient-text italic">гармонии</span></h2></Reveal>
            </div>
          </div>
          <div className="process__steps">
            <div className="process__line"><div className="process__line-fill" /></div>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} className="process__step">
                <span className="process__dot" />
                <span className="process__n display">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* МАСТЕРА */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Команда</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Наши <span className="gradient-text italic">мастера</span></h2></Reveal>
            </div>
            <Reveal delay={0.2}><Link to="/masters" className="btn btn--ghost">Все мастера <span className="arrow">→</span></Link></Reveal>
          </div>
          <Stagger className="grid grid-4">
            {masters.map((m) => <MasterCard key={m.slug} m={m} />)}
          </Stagger>
        </div>
      </section>

      {/* АКЦИИ */}
      <section className="section perks">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Специальные предложения</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Приятные <span className="gradient-text italic">бонусы</span></h2></Reveal>
            </div>
          </div>
          <Stagger className="grid grid-3">
            {perks.map((p) => (
              <Reveal key={p.title} className="perk">
                <span className="perk__big display">{p.big}</span>
                <h3 className="h3 display">{p.title}</h3>
                <p className="muted">{p.text}</p>
                <a href={DIKIDI} target="_blank" rel="noreferrer" className="perk__link">{p.cta} <span className="arrow">→</span></a>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ОТЗЫВЫ */}
      <section className="section">
        <div className="glow glow--magenta" style={{ width: 500, height: 400, right: '-10%', top: '10%' }} />
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Отзывы</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Что говорят <span className="gradient-text italic">гостьи</span></h2></Reveal>
            </div>
            <Reveal delay={0.2}><Link to="/reviews" className="btn btn--ghost">Все отзывы <span className="arrow">→</span></Link></Reveal>
          </div>
          <Stagger className="grid grid-3">
            {reviews.slice(0, 3).map((r) => <ReviewCard key={r.name} r={r} />)}
          </Stagger>
        </div>
      </section>

      {/* БЛОГ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Блог</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Статьи о <span className="gradient-text italic">себе и теле</span></h2></Reveal>
            </div>
            <Reveal delay={0.2}><Link to="/blog" className="btn btn--ghost">Все статьи <span className="arrow">→</span></Link></Reveal>
          </div>
          <Stagger className="grid grid-3">
            {articles.slice(0, 3).map((a) => <ArticleCard key={a.slug} a={a} />)}
          </Stagger>
        </div>
      </section>

      <CtaBand />
    </div>
  )
}
