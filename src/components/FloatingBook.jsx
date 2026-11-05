import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSite } from '../lib/content.jsx'
import { TelegramIcon, WhatsAppIcon, MaxIcon } from './Icons.jsx'

export default function FloatingBook() {
  const { DIKIDI, contacts } = useSite()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="floating"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <a href={contacts.telegram} target="_blank" rel="noreferrer" className="floating__icon glass" aria-label="Telegram">
            <TelegramIcon />
          </a>
          <a href={contacts.whatsapp} target="_blank" rel="noreferrer" className="floating__icon glass" aria-label="WhatsApp">
            <WhatsAppIcon />
          </a>
          <a href={contacts.max} target="_blank" rel="noreferrer" className="floating__icon glass" aria-label="MAX">
            <MaxIcon />
          </a>
          <a href={DIKIDI} target="_blank" rel="noreferrer" className="btn btn--primary floating__btn">
            Записаться
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
