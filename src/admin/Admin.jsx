import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, getToken, setToken, API_BASE } from '../lib/api.js'
import { ToastProvider } from './ui.jsx'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import Leads from './Leads.jsx'
import ReviewsAdmin from './ReviewsAdmin.jsx'
import Collection from './Collection.jsx'
import Settings from './Settings.jsx'
import { schemas } from './schemas.js'
import './admin.css'

const nav = [
  { to: '', label: 'Дашборд', icon: '◔', end: true },
  { to: 'leads', label: 'Заявки', icon: '✉', badge: 'leads' },
  { to: 'reviews', label: 'Отзывы', icon: '★', badge: 'reviews' },
  { to: 'massages', label: 'Массажи', icon: '◈' },
  { to: 'masters', label: 'Мастера', icon: '☺' },
  { to: 'articles', label: 'Статьи', icon: '¶' },
  { to: 'settings', label: 'Настройки', icon: '⚙' },
]

export default function Admin() {
  const [authed, setAuthed] = useState(null)
  const [pending, setPending] = useState({ leads: 0, reviews: 0 })
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Админка · ProOrgazm'
    // Пингуем API даже без токена: на статическом хостинге сразу покажем, что сервер не подключён
    api('/admin/me', { auth: true })
      .then(() => setAuthed(true))
      .catch((e) => setAuthed(e.offline ? 'offline' : false))
  }, [])

  const refreshPending = useCallback(() => {
    api('/admin/stats?days=7', { auth: true }).then((s) => setPending(s.pending)).catch(() => {})
  }, [])

  useEffect(() => { if (authed) refreshPending() }, [authed, refreshPending])

  const logout = async () => {
    await api('/admin/logout', { method: 'POST', auth: true }).catch(() => {})
    setToken(null)
    setAuthed(false)
    navigate('/admin')
  }

  if (authed === null) return <div className="adm adm-loading">Загрузка…</div>
  if (authed === 'offline') return <Offline />
  if (!authed) return <ToastProvider><Login onLogin={() => setAuthed(true)} /></ToastProvider>

  return (
    <ToastProvider onAuthError={() => setAuthed(false)}>
      <div className="adm">
        <aside className={`adm-side ${menu ? 'is-open' : ''}`}>
          <div className="adm-side__logo">Pro<span>Orgazm</span><small>admin</small></div>
          <nav onClick={() => setMenu(false)}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="adm-nav">
                <span className="adm-nav__icon">{n.icon}</span>
                {n.label}
                {n.badge && pending[n.badge] > 0 && <span className="adm-badge">{pending[n.badge]}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="adm-side__foot">
            <a href="/" target="_blank" rel="noreferrer" className="adm-nav"><span className="adm-nav__icon">↗</span>Открыть сайт</a>
            <button className="adm-nav" onClick={logout}><span className="adm-nav__icon">⏻</span>Выйти</button>
          </div>
        </aside>
        <button className="adm-burger" onClick={() => setMenu((v) => !v)} aria-label="Меню">☰</button>
        <main className="adm-main">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads onChange={refreshPending} />} />
            <Route path="reviews" element={<ReviewsAdmin onChange={refreshPending} />} />
            {Object.entries(schemas).map(([key, schema]) => (
              <Route key={key} path={key} element={<Collection key={key} collection={key} schema={schema} />} />
            ))}
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}

function Offline() {
  return (
    <div className="adm-login">
      <div className="adm-login__card">
        <div className="adm-side__logo">Pro<span>Orgazm</span><small>admin</small></div>
        <h1>Сервер админки не подключён</h1>
        <p className="adm-offline__text">
          Админка хранит контент, заявки и статистику на сервере API, а он сейчас не отвечает
          {API_BASE ? <> по адресу <code>{API_BASE}</code></> : ' на этом домене'}.
        </p>
        <p className="adm-offline__text">
          На статическом хостинге (Surge) API не запускается: его нужно развернуть отдельно на Node-хостинге
          и собрать сайт с переменной <code>VITE_API_URL</code>. Подробности — в README, раздел «Деплой».
        </p>
        <button className="adm-btn adm-btn--primary" onClick={() => location.reload()}>Проверить снова</button>
      </div>
    </div>
  )
}
