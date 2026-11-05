import { lockScroll } from '../lib/smooth.js'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from './Logo.jsx'

const KEY = 'po-age-ok'
export const AGE_EVENT = 'po:age-ok'

function readOk() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export const ageConfirmed = readOk

export default function AgeGate() {
  const [ok, setOk] = useState(readOk)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    lockScroll('age', !ok)
  }, [ok])

  const accept = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* приватный режим */ }
    setOk(true)
    window.dispatchEvent(new Event(AGE_EVENT))
  }

  return (
    <AnimatePresence>
      {!ok && (
        <motion.div
          className="age-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <div className="glow glow--violet" style={{ width: 520, height: 520, top: '10%', left: '20%' }} />
          <div className="glow glow--magenta" style={{ width: 380, height: 380, bottom: '5%', right: '15%' }} />
          <motion.div
            className="age-gate__card glass"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
          >
            <Logo />
            <div className="age-gate__badge display">18+</div>
            {denied ? (
              <p className="muted">К сожалению, сайт доступен только совершеннолетним посетителям.</p>
            ) : (
              <>
                <h2 className="display h3">Сайт для лиц старше 18 лет</h2>
                <p className="muted">Подтвердите, что вам исполнилось 18 лет, чтобы продолжить.</p>
                <div className="age-gate__actions">
                  <button className="btn btn--primary" onClick={accept}>Мне есть 18 лет</button>
                  <button className="btn btn--ghost" onClick={() => setDenied(true)}>Мне нет 18</button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
