const TOKEN_KEY = 'po-admin-token'

// Адрес API. Пусто — тот же домен (dev-прокси или `npm start`).
// Для статического хостинга (Surge) задайте при сборке: VITE_API_URL=https://api.example.com
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// Загруженные фото хранятся на сервере API: относительные пути дополняем его адресом
export const mediaUrl = (src) => (src && src.startsWith('/uploads/') ? `${API_BASE}${src}` : src)

// Для фото вида name-1200.webp есть уменьшенная копия name-640.webp — отдаём браузеру обе
export function srcSet(src) {
  const m = src && src.match(/^(.*)-(1200|1600)\.webp$/)
  if (!m) return undefined
  return `${mediaUrl(`${m[1]}-640.webp`)} 640w, ${mediaUrl(src)} ${m[2]}w`
}

const offline = () => {
  const err = new Error('Сервер недоступен, попробуйте позже или напишите нам в мессенджер')
  err.status = 503
  err.offline = true
  return err
}

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* приватный режим */ }
}

export async function api(path, { method = 'GET', body, auth = false, form } = {}) {
  const headers = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth && getToken()) headers.authorization = `Bearer ${getToken()}`
  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw offline()
  }
  if (res.status === 204) return null
  // На статическом хостинге (Surge) вместо API может прийти index.html со статусом 200
  if (!(res.headers.get('content-type') || '').includes('application/json')) throw offline()
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Ошибка сети')
    err.status = res.status
    throw err
  }
  return data
}
