import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { openCookieSettings } from '../lib/consent.js'
import { useSite } from '../lib/content.jsx'

export default function Footer() {
  const { DIKIDI, contacts, massages } = useSite()
  return (
    <footer className="footer">
      <div className="glow glow--violet" style={{ width: 500, height: 300, left: '-10%', bottom: '-30%' }} />
      <div className="container">
        <div className="footer__cta">
          <h2 className="display h2">
            Ваше удовольствие —<br />
            <span className="gradient-text italic">в наших руках</span>
          </h2>
          <a href={DIKIDI} target="_blank" rel="noreferrer" className="btn btn--primary">
            Записаться онлайн <span className="arrow">→</span>
          </a>
        </div>

        <div className="divider" />

        <div className="footer__grid">
          <div className="footer__col">
            <Logo />
            <p className="muted footer__about">
              Салон эротического массажа для женщин в Москве: {contacts.address.replace(/^Москва,\s*/, '')}, {contacts.metro}. Полная конфиденциальность и безопасность.
            </p>
          </div>
          <div className="footer__col">
            <h4>Программы</h4>
            {massages.map((m) => (
              <Link key={m.slug} to={`/massages/${m.slug}`}>{m.title}</Link>
            ))}
          </div>
          <div className="footer__col">
            <h4>Салон</h4>
            <Link to="/masters">Мастера</Link>
            <Link to="/reviews">Отзывы</Link>
            <Link to="/blog">Блог</Link>
            <Link to="/contacts">Контакты</Link>
          </div>
          <div className="footer__col">
            <h4>Связь</h4>
            <a href={contacts.phoneHref}>{contacts.phone}</a>
            <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
            <a href={contacts.telegram} target="_blank" rel="noreferrer">Telegram</a>
            <a href={contacts.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={contacts.max} target="_blank" rel="noreferrer">MAX</a>
            <span className="muted">{contacts.address}, {contacts.metro}</span>
            <span className="muted">Работаем {contacts.hours}</span>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© 2026 ProOrgazm. Все права защищены.</span>
          <span className="footer__legal">
            <Link to="/privacy">Политика конфиденциальности</Link>
            <button onClick={openCookieSettings}>Настройки cookie</button>
          </span>
          <span className="footer__age">18+</span>
        </div>
      </div>
    </footer>
  )
}
