import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function PageHero({ eyebrow, title, accent, text, crumbs = [], children }) {
  return (
    <section className="page-hero">
      <div className="glow glow--violet" style={{ width: 620, height: 420, top: '-30%', right: '-10%' }} />
      <div className="glow glow--magenta" style={{ width: 380, height: 300, bottom: '-20%', left: '-5%' }} />
      <div className="container page-hero__inner">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          {crumbs.map((c) => (
            <span key={c.label}>
              <i>/</i>
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
        <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {eyebrow}
        </motion.span>
        <motion.h1
          className="display h1"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          {title} {accent && <span className="gradient-text italic">{accent}</span>}
        </motion.h1>
        {text && (
          <motion.p className="lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
            {text}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  )
}
