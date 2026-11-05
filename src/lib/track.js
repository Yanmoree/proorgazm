import { API_BASE } from './api.js'
import { analyticsAllowed, CONSENT_EVENT } from './consent.js'

// Анонимная статистика: случайный id посетителя, без личных данных
const VID_KEY = 'po-vid'

function vid() {
  try {
    let v = localStorage.getItem(VID_KEY)
    if (!v) {
      v = crypto.randomUUID?.() || String(Math.random()).slice(2)
      localStorage.setItem(VID_KEY, v)
    }
    return v
  } catch {
    return 'anon'
  }
}

export function track(type, extra = {}) {
  if (!analyticsAllowed()) return
  const payload = JSON.stringify({ type, path: location.pathname, vid: vid(), ...extra })
  const url = `${API_BASE}/api/track`
  // text/plain — «простой» запрос: уходит на другой домен без CORS-предзапроса
  const blob = new Blob([payload], { type: 'text/plain' })
  if (navigator.sendBeacon?.(url, blob)) return
  fetch(url, { method: 'POST', body: payload, headers: { 'content-type': 'text/plain' }, keepalive: true }).catch(() => {})
}

let lastPath = null
export function trackPageview() {
  if (!analyticsAllowed() || location.pathname === lastPath) return
  const first = lastPath === null
  lastPath = location.pathname
  track('pageview', { ref: first ? document.referrer : '' })
}

// Клики по записи и мессенджерам ловим глобально — не нужно размечать каждую кнопку
export function listenOutbound() {
  const onClick = (e) => {
    const a = e.target.closest?.('a[href]')
    if (!a) return
    const href = a.getAttribute('href')
    const label = a.dataset.track || undefined
    if (href.includes('dikidi.net')) track('booking', { label })
    else if (href.includes('t.me/')) track('telegram', { label })
    else if (href.includes('wa.me/')) track('whatsapp', { label })
    else if (href.includes('max.ru/')) track('max', { label })
    else if (href.startsWith('tel:')) track('phone', { label })
  }
  // Согласие дали на этой странице — засчитываем её просмотр
  const onConsent = () => trackPageview()
  document.addEventListener('click', onClick, true)
  window.addEventListener(CONSENT_EVENT, onConsent)
  return () => {
    document.removeEventListener('click', onClick, true)
    window.removeEventListener(CONSENT_EVENT, onConsent)
  }
}
