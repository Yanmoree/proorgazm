import { useEffect, useState } from 'react'
import { PageHead, useAdmin } from './ui.jsx'
import { Field } from './Fields.jsx'
import { mediaUrl } from '../lib/api.js'

export default function Collection({ collection, schema }) {
  const { call, toast } = useAdmin()
  const [list, setList] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { call(`/admin/items/${collection}`).then(setList).catch(() => {}) }, [call, collection])

  const open = (item) => setDraft(item ? { ...item } : { published: true })
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const isNew = !draft.id
      const saved = await call(`/admin/items/${collection}${isNew ? '' : `/${draft.id}`}`, { method: isNew ? 'POST' : 'PUT', body: draft })
      setList((xs) => (isNew ? [...xs, saved] : xs.map((x) => (x.id === saved.id ? saved : x))))
      setDraft(null)
      toast(isNew ? 'Создано' : 'Изменения сохранены')
    } catch { /* тост уже показан */ } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (item) => {
    const saved = await call(`/admin/items/${collection}/${item.id}`, { method: 'PUT', body: { published: !item.published } })
    setList((xs) => xs.map((x) => (x.id === saved.id ? saved : x)))
    toast(saved.published ? 'Опубликовано на сайте' : 'Скрыто с сайта')
  }

  const remove = async (item) => {
    if (!confirm(`Удалить «${item[schema.titleField]}»? Страница пропадёт с сайта.`)) return
    await call(`/admin/items/${collection}/${item.id}`, { method: 'DELETE' })
    setList((xs) => xs.filter((x) => x.id !== item.id))
    setDraft(null)
    toast('Удалено')
  }

  const move = async (i, dir) => {
    const next = [...list]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
    await call(`/admin/items/${collection}/reorder`, { method: 'POST', body: { ids: next.map((x) => x.id) } })
  }

  if (!list) return <div className="adm-muted">Загрузка…</div>

  return (
    <>
      <PageHead title={schema.title} sub="Порядок в списке = порядок на сайте">
        <button className="adm-btn adm-btn--primary" onClick={() => open(null)}>+ Добавить {schema.single}</button>
      </PageHead>

      <div className="adm-card adm-list">
        {list.map((item, i) => (
          <div key={item.id} className={`adm-item ${item.published ? '' : 'is-hidden'}`}>
            <div className="adm-item__order">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Ниже">▼</button>
            </div>
            <div className="adm-item__thumb">{item.image || item.gallery?.[0] ? <img src={mediaUrl(item.image || item.gallery[0])} alt="" /> : <span>◌</span>}</div>
            <button className="adm-item__body" onClick={() => open(item)}>
              <strong>{item[schema.titleField]}</strong>
              <span className="adm-muted adm-small">{schema.meta(item)}</span>
            </button>
            <label className="adm-switch" title={item.published ? 'Опубликовано' : 'Скрыто'}>
              <input type="checkbox" checked={item.published} onChange={() => togglePublish(item)} />
              <span />
            </label>
            <a href={`${schema.path}${item.slug}`} target="_blank" rel="noreferrer" className="adm-icon-btn" aria-label="Открыть на сайте">↗</a>
          </div>
        ))}
      </div>

      {draft && (
        <div className="adm-drawer" onClick={(e) => e.target === e.currentTarget && setDraft(null)}>
          <form className="adm-drawer__panel" onSubmit={save}>
            <div className="adm-drawer__head">
              <h2>{draft.id ? draft[schema.titleField] : `Новая запись`}</h2>
              <button type="button" className="adm-icon-btn" onClick={() => setDraft(null)} aria-label="Закрыть">✕</button>
            </div>
            <div className="adm-form">
              {schema.fields.map((f) => <Field key={f.key} f={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />)}
              <label className="adm-check">
                <input type="checkbox" checked={!!draft.published} onChange={(e) => set('published', e.target.checked)} /> Показывать на сайте
              </label>
            </div>
            <div className="adm-drawer__foot">
              <button className="adm-btn adm-btn--primary" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
              <button type="button" className="adm-btn" onClick={() => setDraft(null)}>Отмена</button>
              {draft.id && <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(draft)}>Удалить</button>}
            </div>
          </form>
        </div>
      )}
    </>
  )
}
