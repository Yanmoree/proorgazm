import { mediaUrl, srcSet } from '../lib/api.js'

export default function Photo({ src, alt = '', label = 'Фото', ratio = '4 / 5', className = '', style, sizes = '(max-width: 640px) 100vw, 50vw', priority = false }) {
  if (src) {
    return (
      <div className={`ph ph--img ${className}`} style={{ aspectRatio: ratio, ...style }}>
        <img src={mediaUrl(src)} srcSet={srcSet(src)} sizes={sizes} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />
      </div>
    )
  }
  return (
    <div className={`ph ${className}`} style={{ aspectRatio: ratio, ...style }}>
      <span className="ph__label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 16-5-5-9 8" />
        </svg>
        {label}
      </span>
    </div>
  )
}
