import { Link, useParams } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import Reveal, { Stagger } from '../components/Reveal.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { MassageCard } from '../components/Cards.jsx'
import { useSite } from '../lib/content.jsx'
import NotFound from './NotFound.jsx'
import RichText from '../components/RichText.jsx'
import Faq from '../components/Faq.jsx'

// Шаблонное наполнение — одинаковая структура для всех 6 программ
const stages = [
  { t: 'Знакомство', d: '10–15 мин', text: 'Чай, беседа с мастером, обсуждение ваших пожеланий и личных границ.' },
  { t: 'Релаксация', d: '30–60 мин', text: 'Расслабляющий массаж всего тела с тёплым маслом снимает зажимы и напряжение.' },
  { t: 'Чувственная часть', d: 'основная', text: 'Неспешная работа с ощущениями в вашем темпе. Вы управляете процессом.' },
  { t: 'Завершение', d: '15–20 мин', text: 'Мягкий восстанавливающий массаж, душ и время на себя.' },
]

const included = ['Беседа с мастером до сеанса', 'Ароматические свечи и лепестки роз', 'Массажные масла на ваш выбор', 'Спокойная музыка и мягкий свет', 'Душ, халат, полотенца', 'В салоне или с выездом к вам']

// «90 минут | 24 000 ₽» по строке на вариант
const parseOptions = (text = '') =>
  text.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter(([d, p]) => d && p)

export default function MassagePage() {
  const { massages } = useSite()
  const { slug } = useParams()
  const m = massages.find((x) => x.slug === slug)
  if (!m) return <NotFound />
  const others = massages.filter((x) => x.slug !== slug).slice(0, 3)
  const options = parseOptions(m.options)

  return (
    <>
      <PageHero
        eyebrow={`Программа · ${m.duration}`}
        title={m.title}
        text={m.short}
        crumbs={[{ label: 'Массажи', to: '/massages' }, { label: m.title }]}
      >
        <div className="mp-hero__info">
          <div className="mp-hero__stat glass"><small>Длительность</small><strong className="display">{m.duration}</strong></div>
          <div className="mp-hero__stat glass"><small>Стоимость</small><strong className="display">{m.price}</strong></div>
          <a href={m.booking} target="_blank" rel="noreferrer" data-track={m.title} className="btn btn--primary">Записаться онлайн <span className="arrow">→</span></a>
        </div>
      </PageHero>


      <section className="section">
        <div className="container mp-body">
          <div className="mp-body__text">
            <Reveal><span className="eyebrow">Описание</span></Reveal>
            <Reveal delay={0.1}><h2 className="display h2">О <span className="gradient-text italic">программе</span></h2></Reveal>
            <Reveal delay={0.15} className="rich">
              <RichText text={m.description || m.short} />
            </Reveal>

            <div className="stages">
              {stages.map((s, i) => (
                <Reveal key={s.t} delay={i * 0.08} className="stage">
                  <span className="stage__n display">0{i + 1}</span>
                  <div>
                    <div className="stage__head"><h3>{s.t}</h3><span className="chip">{s.d}</span></div>
                    <p className="muted">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <aside className="mp-aside">
            <div className="mp-aside__card glass">
              <h3 className="display h3">Что включено</h3>
              <ul>
                {included.map((t) => <li key={t}><span>✓</span>{t}</li>)}
              </ul>
              <div className="divider" />
              {options.length > 0 ? (
                <div className="mp-prices">
                  <small className="muted">Стоимость</small>
                  {options.map(([d, p]) => <div key={d} className="mp-prices__row"><span>{d}</span><strong>{p}</strong></div>)}
                </div>
              ) : (
                <div className="mp-aside__price">
                  <small className="muted">Стоимость</small>
                  <strong className="display">{m.price}</strong>
                </div>
              )}
              <a href={m.booking} target="_blank" rel="noreferrer" data-track={m.title} className="btn btn--primary">Записаться</a>
              <Link to="/contacts" className="btn btn--ghost">Задать вопрос</Link>
            </div>
          </aside>
        </div>
      </section>

      <Faq items={m.faq} title="Вопросы о" accent="программе" />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Смотрите также</span>
              <h2 className="display h2">Другие <span className="gradient-text italic">программы</span></h2>
            </div>
          </div>
          <Stagger className="grid grid-3">
            {others.map((o) => <MassageCard key={o.slug} m={o} index={massages.indexOf(o)} />)}
          </Stagger>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
