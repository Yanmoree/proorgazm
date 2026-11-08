import PageHero from '../components/PageHero.jsx'
import { Stagger } from '../components/Reveal.jsx'
import { MassageCard } from '../components/Cards.jsx'
import CtaBand from '../components/CtaBand.jsx'
import Faq from '../components/Faq.jsx'
import { useSite } from '../lib/content.jsx'
import { useSeo, pageSeo, itemSeo } from '../lib/seo.js'

export default function Massages() {
  const { massages, faq, settings } = useSite()
  useSeo(pageSeo('massages', settings))
  return (
    <>
      <PageHero
        eyebrow="Программы"
        title="Массажи"
        accent="для женщин"
        text="Программы разной длительности и формата. Каждая начинается с беседы и строится вокруг ваших желаний."
        crumbs={[{ label: 'Массажи' }]}
      />
      <section className="section--tight">
        <div className="container">
          <Stagger className="grid grid-3">
            {massages.map((m, i) => <MassageCard key={m.slug} m={m} index={i} />)}
          </Stagger>
        </div>
      </section>

      <Faq items={faq.massages} />
      <CtaBand />
    </>
  )
}
