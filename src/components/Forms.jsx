import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import Select from './Select.jsx'

function useSubmit(path) {
  const [state, setState] = useState({ status: 'idle', error: '', sent: 0 })
  const submit = async (e, extra = {}) => {
    e.preventDefault()
    const form = e.currentTarget
    const body = { ...Object.fromEntries(new FormData(form)), ...extra }
    setState((s) => ({ ...s, status: 'sending', error: '' }))
    try {
      await api(path, { method: 'POST', body })
      form.reset()
      setState((s) => ({ status: 'done', error: '', sent: s.sent + 1 }))
    } catch (err) {
      setState((s) => ({ ...s, status: 'idle', error: err.message }))
    }
  }
  return [state, submit]
}

function Status({ state, done }) {
  return (
    <AnimatePresence mode="wait">
      {state.error && (
        <motion.p key="e" className="form__msg form__msg--error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {state.error}
        </motion.p>
      )}
      {state.status === 'done' && (
        <motion.p key="d" className="form__msg form__msg--ok" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {done}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export function LeadForm({ source = 'Контакты' }) {
  const [state, submit] = useSubmit('/leads')
  return (
    <form className="form" onSubmit={(e) => submit(e, { source, consent: e.currentTarget.consent.checked })}>
      <input className="input" name="name" placeholder="Имя" required minLength={2} maxLength={60} />
      <input className="input" name="phone" placeholder="Телефон" type="tel" required maxLength={30} />
      <textarea className="input" name="message" rows={4} placeholder="Сообщение" maxLength={2000} />
      <label className="checkbox"><input type="checkbox" name="consent" required /> <span>Согласна с <Link to="/privacy">политикой конфиденциальности</Link></span></label>
      <button className="btn btn--primary" type="submit" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Отправляем…' : 'Отправить'}
      </button>
      <Status state={state} done="Спасибо! Мы свяжемся с вами в ближайшее время." />
    </form>
  )
}

export function ReviewForm({ masters }) {
  const [state, submit] = useSubmit('/reviews')
  const [rating, setRating] = useState(5)
  return (
    <form className="form" onSubmit={(e) => submit(e, { rating })}>
      <input className="input" name="name" placeholder="Ваше имя" required minLength={2} maxLength={60} />
      <Select
        key={state.sent}
        name="master"
        ariaLabel="Мастер"
        placeholder="Мастер (необязательно)"
        options={[{ value: '', label: 'Не важно' }, ...masters.map((m) => ({ value: m.name.split(' ')[0], label: m.name }))]}
      />
      <div className="stars-input" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={n <= rating ? 'is-on' : ''} onClick={() => setRating(n)} aria-label={`${n} из 5`}>★</button>
        ))}
      </div>
      <textarea className="input" name="text" rows={5} placeholder="Ваш отзыв" required minLength={10} maxLength={2000} />
      <button className="btn btn--primary" type="submit" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Отправляем…' : 'Отправить отзыв'}
      </button>
      <Status state={state} done="Спасибо! Отзыв появится после модерации." />
    </form>
  )
}
