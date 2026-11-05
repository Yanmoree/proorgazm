import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Reveal from './Reveal.jsx'

// Блок «Вопрос-ответ»: аккордеон + разметка FAQPage для поисковиков
export default function Faq({ items = [], title = 'Частые', accent = 'вопросы', eyebrow = 'Вопрос-ответ' }) {
  const [open, setOpen] = useState(0)
  const uid = useId()
  const list = items.filter((x) => x?.q && x?.a)
  if (!list.length) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
  }

  return (
    <section className="section">
      <div className="container faq">
        <div className="faq__intro">
          <Reveal><span className="eyebrow">{eyebrow}</span></Reveal>
          <Reveal delay={0.1}><h2 className="display h2">{title} <span className="gradient-text italic">{accent}</span></h2></Reveal>
        </div>
        <div className="faq__list">
          {list.map((x, i) => {
            const isOpen = open === i
            return (
              <Reveal key={x.q} delay={Math.min(i, 5) * 0.05}>
                <div className={`faq__item glass ${isOpen ? 'is-open' : ''}`}>
                  <button
                    className="faq__q"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    aria-controls={`${uid}-${i}`}
                  >
                    {x.q}
                    <span className="faq__plus" aria-hidden="true">+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${uid}-${i}`}
                        className="faq__a"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <p className="muted">{x.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </section>
  )
}
