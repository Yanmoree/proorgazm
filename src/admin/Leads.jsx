import { useEffect, useState } from 'react'
import { PageHead, Segmented, useAdmin, fmtDateTime } from './ui.jsx'
import Select from '../components/Select.jsx'

const STATUSES = { new: 'Новая', in_progress: 'В работе', done: 'Обработана' }

export default function Leads({ onChange }) {
  const { call, toast } = useAdmin()
  const [list, setList] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = () => call('/admin/leads').then(setList).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (l, status) => {
    const upd = await call(`/admin/leads/${l.id}`, { method: 'PATCH', body: { status } })
    setList((xs) => xs.map((x) => (x.id === l.id ? upd : x)))
    onChange?.()
  }
  const remove = async (l) => {
    if (!confirm(`Удалить заявку от «${l.name}»?`)) return
    await call(`/admin/leads/${l.id}`, { method: 'DELETE' })
    setList((xs) => xs.filter((x) => x.id !== l.id))
    toast('Заявка удалена')
    onChange?.()
  }

  if (!list) return <div className="adm-muted">Загрузка…</div>
  const shown = filter === 'all' ? list : list.filter((l) => l.status === filter)

  return (
    <>
      <PageHead title="Заявки" sub="Обращения из формы «Задать вопрос» на сайте">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: `Все · ${list.length}` }, ...Object.entries(STATUSES).map(([v, l]) => ({ value: v, label: `${l} · ${list.filter((x) => x.status === v).length}` }))]} />
      </PageHead>
      {shown.length === 0 ? (
        <div className="adm-card adm-empty">Заявок нет</div>
      ) : (
        <div className="adm-card adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Дата</th><th>Имя</th><th>Телефон</th><th>Сообщение</th><th>Источник</th><th>Статус</th><th /></tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className={l.status === 'new' ? 'is-new' : ''}>
                  <td className="nowrap">{fmtDateTime(l.created_at)}</td>
                  <td>{l.name}</td>
                  <td className="nowrap"><a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="adm-link">{l.phone}</a></td>
                  <td className="adm-cell-text">{l.message || <span className="adm-muted">—</span>}</td>
                  <td className="adm-muted">{l.source}</td>
                  <td>
                    <Select
                      variant="admin"
                      className={`adm-status--${l.status}`}
                      ariaLabel="Статус заявки"
                      value={l.status}
                      onChange={(v) => setStatus(l, v)}
                      options={Object.entries(STATUSES).map(([v, t]) => ({ value: v, label: t }))}
                    />
                  </td>
                  <td><button className="adm-icon-btn" onClick={() => remove(l)} aria-label="Удалить">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
