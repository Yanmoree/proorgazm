export default function Marquee({ items }) {
  const row = [...items, ...items]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row.map((t, i) => (
          <span key={i} className="marquee__item display">
            {t} <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  )
}
