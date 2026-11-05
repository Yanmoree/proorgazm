import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getConsent, setConsent, OPEN_SETTINGS_EVENT } from '../lib/consent.js'
import { AGE_EVENT, ageConfirmed } from './AgeGate.jsx'

export default function CookieBanner() {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(true)

  useEffect(() => {
    // Показываем после подтверждения 18+, если выбор ещё не сделан
    const maybeShow = () => { if (ageConfirmed() && !getConsent()) setOpen(true) }
    const openSettings = () => {
      setAnalytics(getConsent()?.analytics ?? true)
      setDetails(true)
      setOpen(true)
    }
    maybeShow()
    window.addEventListener(AGE_EVENT, maybeShow)
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings)
    return () => {
      window.removeEventListener(AGE_EVENT, maybeShow)
      window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings)
    }
  }, [])

  const save = (value) => {
    setConsent({ analytics: value })
    setOpen(false)
    setDetails(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cookie glass"
          role="dialog"
          aria-labelledby="cookie-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="cookie__text">
            <strong id="cookie-title">Мы используем cookie</strong>
            <p className="muted">
              Необходимые cookie нужны для работы сайта. С вашего согласия мы также собираем анонимную статистику
              посещений, чтобы делать сайт удобнее. Подробнее — в <Link to="/privacy">политике конфиденциальности</Link>.
            </p>
          </div>

          {details && (
            <div className="cookie__options">
              <label className="cookie__opt is-locked">
                <input type="checkbox" checked disabled />
                <span><b>Необходимые</b><small>Подтверждение возраста, выбор cookie, вход в админку. Отключить нельзя.</small></span>
              </label>
              <label className="cookie__opt">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
                <span><b>Аналитика</b><small>Анонимный счётчик посещений и кликов по кнопкам записи. Без личных данных.</small></span>
              </label>
            </div>
          )}

          <div className="cookie__actions">
            {details ? (
              <button className="btn btn--primary btn--sm" onClick={() => save(analytics)}>Сохранить выбор</button>
            ) : (
              <>
                <button className="btn btn--primary btn--sm" onClick={() => save(true)}>Принять все</button>
                <button className="btn btn--ghost btn--sm" onClick={() => save(false)}>Только необходимые</button>
                <button className="cookie__link" onClick={() => setDetails(true)}>Настроить</button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
