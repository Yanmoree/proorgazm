// Согласие на cookie: необходимые работают всегда, аналитика — только после согласия.
// Храним в cookie po_consent (на год) и дублируем в localStorage.
const KEY = 'po_consent'
const YEAR = 365 * 24 * 3600
export const CONSENT_EVENT = 'po:consent'
export const OPEN_SETTINGS_EVENT = 'po:cookie-settings'

function readCookie() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

export function getConsent() {
  let raw = readCookie()
  if (!raw) {
    try { raw = localStorage.getItem(KEY) } catch { /* приватный режим */ }
  }
  try {
    const c = JSON.parse(raw)
    return c && typeof c === 'object' ? { necessary: true, analytics: !!c.analytics, date: c.date } : null
  } catch {
    return null
  }
}

export function setConsent({ analytics }) {
  const value = JSON.stringify({ analytics: !!analytics, date: new Date().toISOString().slice(0, 10) })
  document.cookie = `${KEY}=${encodeURIComponent(value)}; max-age=${YEAR}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  try { localStorage.setItem(KEY, value) } catch { /* приватный режим */ }
  if (!analytics) {
    try { localStorage.removeItem('po-vid') } catch { /* приватный режим */ }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: getConsent() }))
}

export const analyticsAllowed = () => !!getConsent()?.analytics
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
