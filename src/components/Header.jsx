import { lockScroll } from '../lib/smooth.js'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from './Logo.jsx'
import { useSite, ratingsLabel } from '../lib/content.jsx'
import Stars from './Stars.jsx'
import { TelegramIcon, WhatsAppIcon, MaxIcon } from './Icons.jsx'

const nav = [
  { to: '/', label: 'Главная', end: true },
  { to: '/massages', label: 'Массажи' },
  { to: '/masters', label: 'Мастера' },
  { to: '/reviews', label: 'Отзывы' },
  { to: '/blog', label: 'Блог' },
  { to: '/contacts', label: 'Контакты' },
]

export default function Header() {
  const { DIKIDI, contacts, rating, ratings } = useSite()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    lockScroll('menu', open)
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className={`header ${scrolled && !open ? 'is-scrolled' : ''} ${open ? 'is-menu-open' : ''}`}>
      <div className="container header__inner">
        <Logo />

        <nav className="nav" aria-label="Основное меню">
          {nav.map((item) => (
            <div key={item.to} className="nav__item">
              <NavLink to={item.to} end={item.end} className="nav__link">
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="header__actions">
          <a href={contacts.phoneHref} className="header__phone">{contacts.phone}</a>
          <a href={DIKIDI} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm header__cta">
            Записаться
          </a>
          <button
            className={`burger ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
          >
            <span /><span />
          </button>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="m-menu"
              initial={{ clipPath: 'circle(0px at calc(100% - 38px) 38px)' }}
              animate={{ clipPath: 'circle(150% at calc(100% - 38px) 38px)' }}
              exit={{ clipPath: 'circle(0px at calc(100% - 38px) 38px)' }}
              transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="m-menu__glow m-menu__glow--1" aria-hidden="true" />
              <div className="m-menu__glow m-menu__glow--2" aria-hidden="true" />

              <div className="m-menu__scroll">
                <motion.span
                  className="m-menu__eyebrow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Салон эротического массажа · {contacts.metro.replace(/\.\s+/, '.\u00a0')}
                </motion.span>

                <motion.nav
                  className="m-menu__nav"
                  aria-label="Меню"
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
                >
                  {nav.map((item, i) => (
                    <motion.div
                      key={item.to}
                      variants={{ hidden: { opacity: 0, x: -28 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
                    >
                      <NavLink to={item.to} end={item.end} className="m-menu__link">
                        <span className="m-menu__num">0{i + 1}</span>
                        <span className="m-menu__label display">{item.label}</span>
                        <span className="m-menu__arrow" aria-hidden="true">↗</span>
                      </NavLink>
                    </motion.div>
                  ))}
                </motion.nav>

                <motion.div
                  className="m-menu__foot"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="m-menu__card glass">
                    <a href={contacts.phoneHref} className="m-menu__phone">{contacts.phone}</a>
                    <span className="m-menu__muted">Работаем {contacts.hours} · {contacts.address.replace(/^Москва,\s*/, '')}</span>
                    <span className="m-menu__rating"><Stars value={rating} size={13} /> {rating.toFixed(1)} · {ratingsLabel(ratings)}</span>
                  </div>
                  <div className="m-menu__actions">
                    <a href={contacts.telegram} target="_blank" rel="noreferrer" className="m-menu__icon glass" aria-label="Telegram"><TelegramIcon /></a>
                    <a href={contacts.whatsapp} target="_blank" rel="noreferrer" className="m-menu__icon glass" aria-label="WhatsApp"><WhatsAppIcon /></a>
                    <a href={contacts.max} target="_blank" rel="noreferrer" className="m-menu__icon glass" aria-label="MAX"><MaxIcon /></a>
                    <a href={DIKIDI} target="_blank" rel="noreferrer" data-track="Мобильное меню" className="btn btn--primary m-menu__cta">Записаться</a>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  )
}
