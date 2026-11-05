import { useEffect, useRef, useState } from 'react'
import Photo from './Photo.jsx'
import { mediaUrl, srcSet } from '../lib/api.js'

// Листаемая галерея: свайп на телефоне (scroll-snap), стрелки, точки и миниатюры
export default function Gallery({ images, alt = '', ratio = '4 / 5' }) {
  const track = useRef(null)
  const [index, setIndex] = useState(0)
  const list = images.filter(Boolean)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const go = (i) => {
    const el = track.current
    const next = (i + list.length) % list.length
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  if (!list.length) return <Photo label="Фото мастера" ratio={ratio} />

  return (
    <div className="gallery" onKeyDown={(e) => { if (e.key === 'ArrowRight') go(index + 1); if (e.key === 'ArrowLeft') go(index - 1) }}>
      <div className="gallery__frame" style={{ aspectRatio: ratio }}>
        <div className="gallery__track" ref={track} tabIndex={0} aria-label="Фотографии, листайте влево и вправо">
          {list.map((src, i) => (
            <div key={src + i} className="gallery__slide">
              <img src={mediaUrl(src)} srcSet={srcSet(src)} sizes="(max-width: 860px) 100vw, 45vw" alt={`${alt} — фото ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" draggable="false" />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <>
            <button className="gallery__arrow gallery__arrow--prev" onClick={() => go(index - 1)} aria-label="Предыдущее фото">‹</button>
            <button className="gallery__arrow gallery__arrow--next" onClick={() => go(index + 1)} aria-label="Следующее фото">›</button>
            <span className="gallery__count">{index + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="gallery__thumbs">
          {list.map((src, i) => (
            <button key={src + i} className={`gallery__thumb ${i === index ? 'is-active' : ''}`} onClick={() => go(i)} aria-label={`Фото ${i + 1}`}>
              <img src={mediaUrl(src.replace(/-(1200|1600)\.webp$/, '-640.webp'))} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
