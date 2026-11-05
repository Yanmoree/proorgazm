import Reveal from './Reveal.jsx'
import { useSite } from '../lib/content.jsx'

export default function CtaBand({ title = 'Готовы подарить себе', accent = 'новые ощущения?', text = 'Запишитесь онлайн за минуту или задайте вопрос в мессенджере — ответим анонимно и деликатно.', href, cta = 'Записаться онлайн' }) {
  const { DIKIDI, contacts } = useSite()
  return (
    <section className="section--tight">
      <div className="container">
        <Reveal className="cta-band">
          <div className="cta-band__orb" aria-hidden="true" />
          <div className="cta-band__content">
            <h2 className="display h2">{title} <span className="gradient-text italic">{accent}</span></h2>
            <p className="lead">{text}</p>
          </div>
          <div className="cta-band__actions">
            <a href={href || DIKIDI} target="_blank" rel="noreferrer" className="btn btn--primary">{cta} <span className="arrow">→</span></a>
            <a href={contacts.telegram} target="_blank" rel="noreferrer" className="btn btn--ghost">Написать в Telegram</a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
