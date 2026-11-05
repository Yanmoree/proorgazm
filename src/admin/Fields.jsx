import { useEffect, useRef, useState } from 'react'
import { useAdmin } from './ui.jsx'
import { mediaUrl } from '../lib/api.js'

export function ImageField({ value, onChange }) {
  const { call, toast } = useAdmin()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    try {
      const { url } = await call('/admin/upload', { method: 'POST', form })
      onChange(url)
      toast('Фото загружено')
    } catch { /* тост уже показан */ } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="adm-image"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]) }}
    >
      {value ? <img src={mediaUrl(value)} alt="" /> : <div className="adm-image__empty">Перетащите фото сюда</div>}
      <div className="adm-row">
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => input.current.click()} disabled={busy}>
          {busy ? 'Загрузка…' : value ? 'Заменить' : 'Загрузить фото'}
        </button>
        {value && <button type="button" className="adm-btn adm-btn--sm" onClick={() => onChange('')}>Убрать</button>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => upload(e.target.files[0])} />
    </div>
  )
}

async function uploadFile(call, file) {
  const form = new FormData()
  form.append('file', file)
  const { url } = await call('/admin/upload', { method: 'POST', form })
  return url
}

export function GalleryField({ value, onChange }) {
  const { call, toast } = useAdmin()
  const input = useRef(null)
  const [busy, setBusy] = useState(0)
  const list = Array.isArray(value) ? value : []

  const upload = async (files) => {
    const arr = [...files].filter((f) => f.type.startsWith('image/'))
    if (!arr.length) return
    setBusy(arr.length)
    const urls = []
    for (const file of arr) {
      try { urls.push(await uploadFile(call, file)) } catch { /* тост уже показан */ }
      setBusy((n) => n - 1)
    }
    if (urls.length) {
      onChange([...list, ...urls])
      toast(`Загружено фото: ${urls.length}`)
    }
  }
  const move = (i, d) => {
    const next = [...list]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div
      className="adm-gallery"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }}
    >
      <div className="adm-gallery__grid">
        {list.map((src, i) => (
          <div key={src + i} className="adm-gallery__item">
            <img src={mediaUrl(src)} alt="" />
            <div className="adm-gallery__tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Левее">‹</button>
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Удалить фото">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Правее">›</button>
            </div>
          </div>
        ))}
        <button type="button" className="adm-gallery__add" onClick={() => input.current.click()} disabled={busy > 0}>
          {busy > 0 ? `Загрузка… ${busy}` : '+ Добавить фото'}
        </button>
      </div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
    </div>
  )
}

export function ProgramsField({ value, onChange }) {
  const { call } = useAdmin()
  const [all, setAll] = useState([])
  useEffect(() => { call('/admin/items/massages').then(setAll).catch(() => {}) }, [call])
  const list = Array.isArray(value) ? value : []
  const toggle = (slug) => onChange(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug])
  return (
    <div className="adm-programs">
      {all.map((m) => (
        <label key={m.slug} className={`adm-program ${list.includes(m.slug) ? 'is-on' : ''}`}>
          <input type="checkbox" checked={list.includes(m.slug)} onChange={() => toggle(m.slug)} />
          {m.title}
        </label>
      ))}
    </div>
  )
}

export function FaqField({ value, onChange }) {
  const list = Array.isArray(value) ? value : []
  const set = (i, k, v) => onChange(list.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i, d) => {
    const next = [...list]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="adm-faq">
      {list.map((x, i) => (
        <div key={i} className="adm-faq__item">
          <div className="adm-faq__head">
            <span className="adm-muted adm-small">Вопрос {i + 1}</span>
            <div className="adm-faq__tools">
              <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">▲</button>
              <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Ниже">▼</button>
              <button type="button" className="adm-icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Удалить вопрос">✕</button>
            </div>
          </div>
          <input className="adm-input" placeholder="Вопрос" value={x.q || ''} onChange={(e) => set(i, 'q', e.target.value)} />
          <textarea className="adm-input" rows={3} placeholder="Ответ" value={x.a || ''} onChange={(e) => set(i, 'a', e.target.value)} />
        </div>
      ))}
      <button type="button" className="adm-btn adm-btn--sm" onClick={() => onChange([...list, { q: '', a: '' }])}>+ Добавить вопрос</button>
    </div>
  )
}

export function Field({ f, value, onChange }) {
  if (f.type === 'checkbox') {
    return (
      <label className="adm-check adm-field">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}
        {f.hint && <small>{f.hint}</small>}
      </label>
    )
  }
  const common = { className: 'adm-input', value: value ?? '', onChange: (e) => onChange(e.target.value), required: f.required }
  return (
    <label className={`adm-field ${f.half ? 'adm-field--half' : ''}`}>
      <span>{f.label}{f.required && ' *'}</span>
      {f.type === 'textarea' ? <textarea rows={f.rows || 4} {...common} />
        : f.type === 'image' ? <ImageField value={value} onChange={onChange} />
        : f.type === 'gallery' ? <GalleryField value={value} onChange={onChange} />
        : f.type === 'programs' ? <ProgramsField value={value} onChange={onChange} />
        : f.type === 'faq' ? <FaqField value={value} onChange={onChange} />
        : f.type === 'list' ? <input {...common} value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={(e) => onChange(e.target.value.split(',').map((t) => t.trimStart()))} />
        : <input {...common} />}
      {f.hint && <small>{f.hint}</small>}
    </label>
  )
}
