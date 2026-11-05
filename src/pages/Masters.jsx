import PageHero from '../components/PageHero.jsx'
import Reveal, { Stagger } from '../components/Reveal.jsx'
import { MasterCard } from '../components/Cards.jsx'
import CtaBand from '../components/CtaBand.jsx'
import Faq from '../components/Faq.jsx'
import { useSite } from '../lib/content.jsx'

const reqs = [
  ['Мастерство', 'Владение техниками массажа и регулярное обучение'],
  ['Знания', 'Понимание женской физиологии и психологии'],
  ['Деликатность', 'Вежливость, такт и уважение к границам'],
  ['Гигиена', 'Безупречная чистота и регулярные медосмотры'],
]

export default function Masters() {
  const { masters, DIKIDI_TRAINING, faq } = useSite()
  return (
    <>
      <PageHero
        eyebrow="Команда"
        title="Наши"
        accent="мастера"
        text="В коллективе ProOrgazm мастера разного возраста, комплекции и типажа — вы сможете выбрать того, с кем будет комфортно именно вам."
        crumbs={[{ label: 'Мастера' }]}
      />
      <section className="section--tight">
        <div className="container">
          <Stagger className="grid grid-4">
            {masters.map((m) => <MasterCard key={m.slug} m={m} />)}
          </Stagger>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal><span className="eyebrow">Стандарты</span></Reveal>
              <Reveal delay={0.1}><h2 className="display h2">Требования к <span className="gradient-text italic">мастерам</span></h2></Reveal>
            </div>
          </div>
          <div className="grid grid-4">
            {reqs.map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="feature glass">
                <span className="feature__icon display">0{i + 1}</span>
                <h3 className="feature__title">{t}</h3>
                <p className="muted">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <Faq items={faq.masters} />
      <CtaBand title="Хотите стать" accent="частью команды?" text="Мы проводим обучение массажу и всегда рады талантливым мастерам." href={DIKIDI_TRAINING} cta="Пройти обучение" />
    </>
  )
}
