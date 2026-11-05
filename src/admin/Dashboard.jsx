import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Segmented, useAdmin, plural } from './ui.jsx'
import { LineChart, BarChart, HBars } from './Charts.jsx'

const PAGE_NAMES = {
  '/': 'Главная', '/massages': 'Массажи', '/masters': 'Мастера', '/reviews': 'Отзывы', '/contacts': 'Контакты', '/blog': 'Блог',
}
const pageName = (p) => PAGE_NAMES[p] || p
const CONTACT_NAMES = { telegram: 'Telegram', whatsapp: 'WhatsApp', max: 'MAX', phone: 'Звонок' }

function Delta({ now, prev }) {
  if (!prev) return <span className="stat__delta">—</span>
  const d = Math.round(((now - prev) / prev) * 100)
  return <span className={`stat__delta ${d >= 0 ? 'is-up' : 'is-down'}`}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}%</span>
}

function Stat({ label, value, prev, suffix = '' }) {
  return (
    <div className="stat adm-card">
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}{suffix}</strong>
      {prev !== undefined && <span className="stat__foot"><Delta now={value} prev={prev} /> к прошлому периоду</span>}
    </div>
  )
}

export default function Dashboard() {
  const { call, toast } = useAdmin()
  const [days, setDays] = useState(30)
  const [s, setS] = useState(null)
  const [table, setTable] = useState(false)

  const load = () => call(`/admin/stats?days=${days}`).then(setS).catch(() => {})
  useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = async () => {
    if (!confirm('Удалить всю собранную статистику посещений? Это действие нельзя отменить.')) return
    await call('/admin/stats', { method: 'DELETE' })
    toast('Статистика очищена')
    load()
  }

  if (!s) return <div className="adm-muted">Загрузка статистики…</div>
  const t = s.totals, p = s.previous
  const conv = t.visitors ? Math.round((t.bookings / t.visitors) * 1000) / 10 : 0
  const prevConv = p.visitors ? Math.round((p.bookings / p.visitors) * 1000) / 10 : 0
  const devices = Object.fromEntries(s.devices.map((d) => [d.device, d.n]))
  const devTotal = (devices.mobile || 0) + (devices.desktop || 0)

  return (
    <>
      <PageHead title="Дашборд" sub={`Статистика за последние ${s.days} ${plural(s.days, ['день', 'дня', 'дней'])}`}>
        <Segmented value={days} onChange={setDays} options={[{ value: 7, label: '7 дней' }, { value: 30, label: '30 дней' }, { value: 90, label: '90 дней' }]} />
      </PageHead>

      {(s.pending.leads > 0 || s.pending.reviews > 0) && (
        <div className="adm-alerts">
          {s.pending.leads > 0 && <Link to="leads" className="adm-alert">✉ {s.pending.leads} {plural(s.pending.leads, ['новая заявка', 'новые заявки', 'новых заявок'])}</Link>}
          {s.pending.reviews > 0 && <Link to="reviews" className="adm-alert">★ {s.pending.reviews} {plural(s.pending.reviews, ['отзыв ждёт', 'отзыва ждут', 'отзывов ждут'])} модерации</Link>}
        </div>
      )}

      <div className="stats-grid">
        <Stat label="Посетители" value={t.visitors} prev={p.visitors} />
        <Stat label="Просмотры" value={t.views} prev={p.views} />
        <Stat label="Клики «Записаться»" value={t.bookings} prev={p.bookings} />
        <Stat label="Конверсия в запись" value={conv} prev={prevConv} suffix="%" />
        <Stat label="Заявки с сайта" value={t.leads} prev={p.leads} />
        <Stat label="Переходы в мессенджеры" value={t.contacts} prev={p.contacts} />
      </div>

      <section className="adm-card adm-panel">
        <div className="adm-panel__head">
          <h2>Посещаемость</h2>
          <button className="adm-link" onClick={() => setTable((v) => !v)}>{table ? 'Показать график' : 'Показать таблицей'}</button>
        </div>
        {table ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Дата</th><th>Посетители</th><th>Просмотры</th><th>Записи</th></tr></thead>
              <tbody>{[...s.series].reverse().map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.visitors}</td><td>{d.views}</td><td>{d.bookings}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <LineChart data={s.series} series={[{ key: 'views', label: 'Просмотры' }, { key: 'visitors', label: 'Посетители' }]} />
        )}
      </section>

      <div className="adm-cols">
        <section className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>Клики «Записаться» по дням</h2></div>
          <BarChart data={s.series} k="bookings" label="Клики «Записаться»" />
        </section>
        <section className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>Откуда записываются</h2></div>
          <HBars rows={s.bookingSources} labelKey="label" format={pageName} />
        </section>
      </div>

      <div className="adm-cols adm-cols--3">
        <section className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>Популярные страницы</h2></div>
          <HBars rows={s.topPages} labelKey="path" format={pageName} />
        </section>
        <section className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>Источники трафика</h2></div>
          <HBars rows={s.referrers} labelKey="ref" />
        </section>
        <section className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>Устройства и связь</h2></div>
          <HBars
            rows={[{ k: 'Телефоны', n: devices.mobile || 0 }, { k: 'Компьютеры', n: devices.desktop || 0 }].filter((r) => devTotal)}
            labelKey="k"
            format={(k) => `${k} · ${Math.round(((k === 'Телефоны' ? devices.mobile : devices.desktop) || 0) / (devTotal || 1) * 100)}%`}
          />
          <div className="adm-divider" />
          <HBars rows={s.contactsByType} labelKey="type" format={(k) => CONTACT_NAMES[k] || k} empty="Переходов в мессенджеры пока нет" />
        </section>
      </div>

      <p className="adm-muted adm-foot">
        Статистика анонимная: считаем визиты, клики по кнопкам записи и мессенджерам, без личных данных.{' '}
        <button className="adm-link" onClick={reset}>Очистить статистику</button>
      </p>
    </>
  )
}
