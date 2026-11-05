// Звёзды рейтинга: розовый слой закрашен ровно на долю оценки (4.8 из 5 → 96%)
export default function Stars({ value = 5, size = 16 }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`Рейтинг ${value.toFixed(1)} из 5`}>
      <span className="stars__base" aria-hidden="true">★★★★★</span>
      <span className="stars__fill" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  )
}
