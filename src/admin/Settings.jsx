import { useEffect, useState } from 'react'
import { PageHead, useAdmin } from './ui.jsx'
import { Field } from './Fields.jsx'

const groups = [
  { key: 'hero', title: 'Главный экран', fields: [
    { key: 'eyebrow', label: 'Надзаголовок' },
    { key: 'title', label: 'Заголовок', half: true },
    { key: 'accent', label: 'Акцент (розовым)', half: true },
    { key: 'subtitle', label: 'Подзаголовок', type: 'textarea', rows: 3 },
  ] },
  { key: 'contacts', title: 'Контакты', fields: [
    { key: 'phone', label: 'Телефон (как показывать)', half: true },
    { key: 'phoneHref', label: 'Телефон для звонка', hint: 'tel:+79685487237', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'hours', label: 'Режим работы', half: true },
    { key: 'address', label: 'Адрес', half: true, hint: 'используется и для карты' },
    { key: 'metro', label: 'Метро', half: true },
    { key: 'coords', label: 'Координаты для карты', half: true, hint: 'широта, долгота — например 55.742387, 37.578054. Обновите при смене адреса' },
    { key: 'telegram', label: 'Telegram', half: true },
    { key: 'whatsapp', label: 'WhatsApp', half: true },
    { key: 'max', label: 'MAX' },
  ] },
  { key: 'links', title: 'Ссылки DIKIDI', fields: [
    { key: 'booking', label: 'Общая запись' },
    { key: 'reviews', label: 'Отзывы в DIKIDI', half: true },
    { key: 'consult', label: 'Консультация', half: true },
    { key: 'training', label: 'Обучение массажу' },
  ] },
  { key: 'photos', title: 'Фото на главной', fields: [
    { key: 'hero', label: 'Первый экран', type: 'image', half: true },
    { key: 'about', label: 'Блок «О салоне»', type: 'image', half: true },
    { key: 'aboutSmall', label: 'Малое фото «О салоне»', type: 'image', half: true },
  ] },
  { key: 'faq', title: 'Вопрос-ответ на страницах-списках', fields: [
    { key: 'massages', label: 'Страница «Массажи»', type: 'faq' },
    { key: 'masters', label: 'Страница «Мастера»', type: 'faq' },
    { key: 'blog', label: 'Страница «Блог»', type: 'faq' },
  ] },
  { key: 'seo', title: 'SEO', fields: [
    { key: 'title', label: 'Заголовок вкладки' },
    { key: 'description', label: 'Описание для поисковиков', type: 'textarea', rows: 3 },
  ] },
]

export default function Settings() {
  const { call, toast } = useAdmin()
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { call('/admin/settings').then(setS).catch(() => {}) }, [call])

  const set = (g, k, v) => setS((x) => ({ ...x, [g]: { ...x[g], [k]: v } }))
  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      setS(await call('/admin/settings', { method: 'PUT', body: s }))
      toast('Настройки сохранены')
    } catch { /* тост уже показан */ } finally {
      setSaving(false)
    }
  }

  if (!s) return <div className="adm-muted">Загрузка…</div>
  return (
    <form onSubmit={save}>
      <PageHead title="Настройки" sub="Тексты и контакты, общие для всего сайта">
        <button className="adm-btn adm-btn--primary" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
      </PageHead>
      {groups.map((g) => (
        <section key={g.key} className="adm-card adm-panel">
          <div className="adm-panel__head"><h2>{g.title}</h2></div>
          <div className="adm-form">
            {g.fields.map((f) => <Field key={f.key} f={f} value={s[g.key]?.[f.key]} onChange={(v) => set(g.key, f.key, v)} />)}
          </div>
        </section>
      ))}
    </form>
  )
}
