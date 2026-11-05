import { useEffect, useState } from 'react'
import { PageHead, Segmented, useAdmin, fmtDateTime } from './ui.jsx'

const LABELS = { pending: 'На модерации', approved: 'Опубликованы', rejected: 'Отклонены' }

export default function ReviewsAdmin({ onChange }) {
  const { call, toast } = useAdmin()
  const [list, setList] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    call('/admin/reviews').then((l) => {
      setList(l)
      if (!l.some((r) => r.status === 'pending')) setFilter('approved')
    }).catch(() => {})
  }, [call])

  const patch = async (r, body, msg) => {
    const upd = await call(`/admin/reviews/${r.id}`, { method: 'PATCH', body })
    setList((xs) => xs.map((x) => (x.id === r.id ? upd : x)))
    if (msg) toast(msg)
    onChange?.()
  }
  const remove = async (r) => {
    if (!confirm('Удалить отзыв навсегда?')) return
    await call(`/admin/reviews/${r.id}`, { method: 'DELETE' })
    setList((xs) => xs.filter((x) => x.id !== r.id))
    toast('Отзыв удалён')
    onChange?.()
  }

  if (!list) return <div className="adm-muted">Загрузка…</div>
  const shown = list.filter((r) => r.status === filter)

  return (
    <>
      <PageHead title="Отзывы" sub="Новые отзывы появляются на сайте только после одобрения">
        <Segmented value={filter} onChange={setFilter} options={Object.entries(LABELS).map(([v, l]) => ({ value: v, label: `${l} · ${list.filter((x) => x.status === v).length}` }))} />
      </PageHead>
      {shown.length === 0 && <div className="adm-card adm-empty">Здесь пока пусто</div>}
      <div className="adm-reviews">
        {shown.map((r) => (
          <article key={r.id} className="adm-card adm-review">
            <div className="adm-review__head">
              <strong>{r.name}</strong>
              <span className="adm-stars">{'★'.repeat(r.rating)}<i>{'★'.repeat(5 - r.rating)}</i></span>
            </div>
            <div className="adm-muted adm-small">{fmtDateTime(r.created_at)}{r.master && ` · мастер ${r.master}`}</div>
            {editing === r.id ? (
              <form onSubmit={(e) => { e.preventDefault(); patch(r, { text: e.currentTarget.text.value }, 'Текст сохранён'); setEditing(null) }}>
                <textarea name="text" className="adm-input" rows={5} defaultValue={r.text} />
                <div className="adm-row"><button className="adm-btn adm-btn--primary adm-btn--sm">Сохранить</button><button type="button" className="adm-btn adm-btn--sm" onClick={() => setEditing(null)}>Отмена</button></div>
              </form>
            ) : (
              <p className="adm-review__text">{r.text}</p>
            )}
            <div className="adm-row">
              {r.status !== 'approved' && <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => patch(r, { status: 'approved' }, 'Отзыв опубликован')}>Опубликовать</button>}
              {r.status !== 'rejected' && <button className="adm-btn adm-btn--sm" onClick={() => patch(r, { status: 'rejected' }, 'Отзыв скрыт')}>{r.status === 'approved' ? 'Скрыть' : 'Отклонить'}</button>}
              <button className="adm-btn adm-btn--sm" onClick={() => setEditing(r.id)}>Изменить</button>
              <button className="adm-icon-btn" onClick={() => remove(r)} aria-label="Удалить">✕</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
