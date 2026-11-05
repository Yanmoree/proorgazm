import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const ToastCtx = createContext(null)

export function ToastProvider({ children, onAuthError }) {
  const [toasts, setToasts] = useState([])
  const id = useRef(0)
  const authErr = useRef(onAuthError)
  authErr.current = onAuthError
  const toast = useCallback((text, kind = 'ok') => {
    const n = ++id.current
    setToasts((t) => [...t, { n, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.n !== n)), 3200)
  }, [])

  // Обёртка над api: ошибки показываем тостом, при 401 — выкидываем на логин
  const call = useCallback(async (path, opts = {}) => {
    try {
      return await api(path, { auth: true, ...opts })
    } catch (e) {
      if (e.status === 401) authErr.current?.()
      toast(e.message, 'error')
      throw e
    }
  }, [toast])

  return (
    <ToastCtx.Provider value={{ toast, call }}>
      {children}
      <div className="adm-toasts" role="status">
        {toasts.map((t) => <div key={t.n} className={`adm-toast adm-toast--${t.kind}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

export const useAdmin = () => useContext(ToastCtx)

export function PageHead({ title, sub, children }) {
  return (
    <div className="adm-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="adm-head__actions">{children}</div>
    </div>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="adm-seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const fmtDateTime = (ms) =>
  new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many
}
