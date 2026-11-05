import { useEffect, useState } from 'react'

const YANDEX_WIDGET = 'https://yandex.ru/map-widget/v1/'

// Проверяем, открывается ли виджет Яндекса у посетителя (VPN, фильтры сети, блокировки).
// fetch в режиме no-cors падает только при сетевой ошибке — любой ответ сервера считается успехом.
function probeYandex(timeout = 5000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  return fetch(YANDEX_WIDGET, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
    .then(() => true, () => false)
    .finally(() => clearTimeout(timer))
}

const parseCoords = (s = '') => {
  const [lat, lon] = String(s).split(',').map((x) => Number(x.trim()))
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
}

export default function MapEmbed({ address, coords }) {
  const [provider, setProvider] = useState('checking')
  const c = parseCoords(coords)

  useEffect(() => {
    let alive = true
    probeYandex().then((ok) => alive && setProvider(ok ? 'yandex' : 'osm'))
    return () => { alive = false }
  }, [])

  const q = encodeURIComponent(address)
  const yandexSrc = c
    ? `${YANDEX_WIDGET}?ll=${c.lon},${c.lat}&z=16&pt=${c.lon},${c.lat},pm2rdm`
    : `${YANDEX_WIDGET}?mode=search&text=${q}&z=16`
  const osmSrc = c
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${c.lon - 0.006},${c.lat - 0.0025},${c.lon + 0.006},${c.lat + 0.0025}&layer=mapnik&marker=${c.lat},${c.lon}`
    : null
  const yandexLink = c ? `https://yandex.ru/maps/?pt=${c.lon},${c.lat}&z=17&l=map` : `https://yandex.ru/maps/?text=${q}`
  const googleLink = c ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}` : `https://www.google.com/maps/search/?api=1&query=${q}`

  const src = provider === 'yandex' ? yandexSrc : provider === 'osm' ? osmSrc : null

  return (
    <>
      {src ? (
        <iframe key={provider} title={`Карта: ${address}`} src={src} loading="lazy" allowFullScreen />
      ) : (
        <div className="map__placeholder">
          <span className="map__pin-icon" aria-hidden="true" />
          <strong>{address}</strong>
          <small>{provider === 'checking' ? 'Загружаем карту…' : 'Карта недоступна — откройте её по кнопке ниже'}</small>
        </div>
      )}
      <div className="map__links">
        <a className="btn btn--ghost btn--sm" href={yandexLink} target="_blank" rel="noreferrer">Яндекс Карты ↗</a>
        <a className="btn btn--ghost btn--sm" href={googleLink} target="_blank" rel="noreferrer">Google Maps ↗</a>
      </div>
    </>
  )
}
