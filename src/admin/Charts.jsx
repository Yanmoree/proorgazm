import { useEffect, useRef, useState } from 'react'

// Палитра проверена валидатором dataviz на тёмной поверхности #151017
export const SERIES = ['#e8478f', '#3f93d6']

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

const niceMax = (v) => {
  if (v <= 5) return 5
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1)
}

const shortDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}.${m}`
}
const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })

function Tooltip({ x, y, width, children }) {
  const left = Math.min(Math.max(x - 90, 0), width - 180)
  return <div className="chart-tip" style={{ left, top: y }}>{children}</div>
}

function Axis({ max, H, pad, W }) {
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t))
  return ticks.map((t) => {
    const y = H - pad.b - (t / max) * (H - pad.t - pad.b)
    return (
      <g key={t}>
        <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="chart-grid" />
        <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart-axis">{t}</text>
      </g>
    )
  })
}

function XLabels({ data, x, H, pad }) {
  const step = Math.ceil(data.length / 7)
  return data.map((d, i) =>
    i % step === 0 || i === data.length - 1 ? (
      <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" className="chart-axis">{shortDate(d.date)}</text>
    ) : null,
  )
}

export function LineChart({ data, series, height = 260 }) {
  const [ref, W] = useWidth()
  const [hover, setHover] = useState(null)
  const H = height
  const pad = { t: 16, r: 16, b: 28, l: 40 }
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key]))))
  const x = (i) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r)
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b)

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - pad.l) / (W - pad.l - pad.r)) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  return (
    <div className="chart" ref={ref}>
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={s.key}><i className="chart-key chart-key--line" style={{ background: SERIES[i] }} />{s.label}</span>
        ))}
      </div>
      <svg width={W} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(' и ') + ' по дням'}>
        <Axis max={max} H={H} pad={pad} W={W} />
        {series.map((s, si) => {
          const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')
          return (
            <g key={s.key}>
              {si === 0 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`} fill={SERIES[si]} opacity="0.1" />}
              <polyline points={pts} fill="none" stroke={SERIES[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="chart-cross" />
            {series.map((s, si) => (
              <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key])} r="5" fill={SERIES[si]} stroke="#151017" strokeWidth="2" />
            ))}
          </g>
        )}
        <XLabels data={data} x={x} H={H} pad={pad} />
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={8} width={W}>
          <div className="chart-tip__title">{longDate(data[hover].date)}</div>
          {series.map((s, si) => (
            <div key={s.key} className="chart-tip__row">
              <i className="chart-key chart-key--line" style={{ background: SERIES[si] }} />
              <strong>{data[hover][s.key]}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

export function BarChart({ data, k, label, height = 200 }) {
  const [ref, W] = useWidth()
  const [hover, setHover] = useState(null)
  const H = height
  const pad = { t: 12, r: 12, b: 28, l: 40 }
  const max = niceMax(Math.max(1, ...data.map((d) => d[k])))
  const band = (W - pad.l - pad.r) / data.length
  const bw = Math.max(2, Math.min(28, band - 2))
  const x = (i) => pad.l + i * band + band / 2
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b)

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={`${label} по дням`}>
        <Axis max={max} H={H} pad={pad} W={W} />
        {data.map((d, i) => {
          const h = H - pad.b - y(d[k])
          return (
            <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={x(i) - band / 2} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x(i) - bw / 2},${H - pad.b} V${y(d[k]) + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, bw / 2)},-${Math.min(4, h)} H${x(i) + bw / 2 - Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, h)} V${H - pad.b} Z`}
                  fill={SERIES[0]}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          )
        })}
        <XLabels data={data} x={x} H={H} pad={pad} />
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={4} width={W}>
          <div className="chart-tip__title">{longDate(data[hover].date)}</div>
          <div className="chart-tip__row"><strong>{data[hover][k]}</strong><span>{label}</span></div>
        </Tooltip>
      )}
    </div>
  )
}

export function HBars({ rows, labelKey, valueKey = 'n', format = (v) => v, empty = 'Пока нет данных' }) {
  if (!rows.length) return <p className="adm-muted">{empty}</p>
  const max = Math.max(...rows.map((r) => r[valueKey]))
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r[labelKey]} title={`${r[labelKey]}: ${r[valueKey]}`}>
          <div className="hbars__top">
            <span className="hbars__label">{format(r[labelKey])}</span>
            <strong>{r[valueKey]}</strong>
          </div>
          <div className="hbars__track"><div className="hbars__fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}
