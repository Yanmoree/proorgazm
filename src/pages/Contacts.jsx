import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { LeadForm } from '../components/Forms.jsx'
import MapEmbed from '../components/MapEmbed.jsx'
import { useSite } from '../lib/content.jsx'
import { TelegramIcon, WhatsAppIcon, MaxIcon } from '../components/Icons.jsx'
import { useSeo, pageSeo, itemSeo } from '../lib/seo.js'

const makeCards = (contacts) => [
  { label: 'Телефон', value: contacts.phone, href: contacts.phoneHref },
  { label: 'Email', value: contacts.email, href: `mailto:${contacts.email}` },
  { label: 'Режим работы', value: contacts.hours === '24/7' ? 'Круглосуточно, 24/7' : contacts.hours },
  { label: 'Адрес', value: contacts.address, sub: contacts.metro },
]

export default function Contacts() {
  const { DIKIDI, contacts, settings } = useSite()
  useSeo(pageSeo('contacts', settings))
  const cards = makeCards(contacts)
  return (
    <>
      <PageHero
        eyebrow="Контакты"
        title="Свяжитесь"
        accent="с нами"
        text="Ответим на любые вопросы деликатно и анонимно. Удобнее всего — написать в мессенджер."
        crumbs={[{ label: 'Контакты' }]}
      />
      <section className="section--tight">
        <div className="container contacts">
          <div className="contacts__cards">
            {cards.map((c, i) => (
              <Reveal key={c.label} delay={i * 0.06} className="contact-card glass">
                <small>{c.label}</small>
                {c.href ? <a href={c.href} className="display">{c.value}</a> : <span className="display">{c.value}</span>}
                {c.sub && <span className="contact-card__sub">{c.sub}</span>}
              </Reveal>
            ))}
            <Reveal delay={0.3} className="contacts__messengers">
              <a href={contacts.telegram} target="_blank" rel="noreferrer" className="btn btn--ghost btn--icon"><TelegramIcon />Telegram</a>
              <a href={contacts.whatsapp} target="_blank" rel="noreferrer" className="btn btn--ghost btn--icon"><WhatsAppIcon />WhatsApp</a>
              <a href={contacts.max} target="_blank" rel="noreferrer" className="btn btn--ghost btn--icon"><MaxIcon />MAX</a>
              <a href={DIKIDI} target="_blank" rel="noreferrer" className="btn btn--primary">Записаться онлайн</a>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="map glass">
            <MapEmbed address={contacts.address} coords={contacts.coords} />
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Reveal className="review-form glass">
            <div>
              <span className="eyebrow">Обратная связь</span>
              <h2 className="display h2">Задать <span className="gradient-text italic">вопрос</span></h2>
              <p className="muted">Оставьте имя и телефон — перезвоним или напишем в удобный мессенджер.</p>
            </div>
            <LeadForm source="Контакты" />
          </Reveal>
        </div>
      </section>
    </>
  )
}
