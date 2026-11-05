import { Fragment } from 'react'
import { Link } from 'react-router-dom'

// Ссылки в тексте: [текст](/massages) — внутренние открываются без перезагрузки, внешние в новой вкладке
function Inline({ text }) {
  const parts = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const [, label, href] = m
    parts.push(
      href.startsWith('/')
        ? <Link key={m.index} to={href}>{label}</Link>
        : <a key={m.index} href={href} target="_blank" rel="noreferrer">{label}</a>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// Мини-разметка статей: пустая строка — абзац, «## » — подзаголовок, «- » — список, «> » — цитата
export default function RichText({ text = '' }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((b, i) => {
    if (b.startsWith('## ')) return <h2 key={i} className="display"><Inline text={b.slice(3)} /></h2>
    if (b.startsWith('> ')) return <blockquote key={i} className="display">«<Inline text={b.replace(/^>\s?/gm, '')} />»</blockquote>
    const lines = b.split('\n')
    if (lines.every((l) => l.startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.slice(2)} /></li>)}</ul>
    return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l} /></Fragment>)}</p>
  })
}
