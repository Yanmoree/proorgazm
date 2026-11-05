import { useState } from 'react'
import { api, setToken } from '../lib/api.js'

export default function Login({ onLogin }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } })
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <div className="adm-side__logo">Pro<span>Orgazm</span><small>admin</small></div>
        <h1>Вход в панель управления</h1>
        <label className="adm-field">
          <span>Логин</span>
          <input name="username" autoComplete="username" required autoFocus />
        </label>
        <label className="adm-field">
          <span>Пароль</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && <p className="adm-error">{error}</p>}
        <button className="adm-btn adm-btn--primary" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div>
  )
}
