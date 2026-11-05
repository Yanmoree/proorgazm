import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

// Выпадающий список в стиле сайта вместо системного <select>.
// options: [{ value, label }]. С `name` значение уходит в форму как у обычного поля.
// Работает с клавиатуры: стрелки, Enter/пробел, Escape, Home/End и поиск по первой букве.
// Меню выводится поверх страницы (portal), чтобы его не обрезали таблицы и блоки с прокруткой;
// если места снизу мало — открывается вверх.
export default function Select({ options, value, defaultValue = '', onChange, name, placeholder = 'Выберите', className = '', variant = 'site', ariaLabel }) {
  const [inner, setInner] = useState(defaultValue)
  const current = value !== undefined ? value : inner
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null)
  const root = useRef(null)
  const list = useRef(null)
  const uid = useId()
  const selected = options.find((o) => o.value === current)

  const choose = (opt) => {
    if (value === undefined) setInner(opt.value)
    onChange?.(opt.value)
    setOpen(false)
    root.current?.querySelector('button')?.focus()
  }

  // Позиция меню рядом с полем
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = root.current.getBoundingClientRect()
      const height = Math.min(280, options.length * 44 + 12)
      const up = window.innerHeight - r.bottom < height + 16 && r.top > height + 16
      setPos({ left: r.left, width: r.width, top: up ? r.top - height - 6 : r.bottom + 6, up })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, options.length])

  // Клик мимо или прокрутка страницы — закрываем
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!root.current?.contains(e.target) && !list.current?.contains(e.target)) setOpen(false) }
    const onScroll = (e) => { if (!list.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  // При открытии подсвечиваем выбранный пункт и прокручиваем к нему
  useEffect(() => {
    if (!open) return
    const i = Math.max(0, options.findIndex((o) => o.value === current))
    setActive(i)
    requestAnimationFrame(() => list.current?.children[i]?.scrollIntoView({ block: 'nearest' }))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    const move = (i) => {
      e.preventDefault()
      const next = (i + options.length) % options.length
      setActive(next)
      list.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    }
    if (e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()))
      if (i >= 0) move(i)
    }
  }

  return (
    <div ref={root} className={`select select--${variant} ${open ? 'is-open' : ''} ${className}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        className="select__control"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
      >
        <span className={selected?.value ? 'select__value' : 'select__placeholder'}>{selected?.value ? selected.label : placeholder}</span>
        <svg className="select__chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {createPortal(
      <AnimatePresence>
        {open && pos && (
          <motion.ul
            ref={list}
            id={`${uid}-list`}
            role="listbox"
            className={`select__menu select__menu--${variant}`}
            style={{ left: pos.left, top: pos.top, width: pos.width, transformOrigin: pos.up ? 'bottom' : 'top' }}
            initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {options.map((o, i) => (
              <li
                key={o.value || `empty-${i}`}
                role="option"
                aria-selected={o.value === current}
                className={`select__option ${i === active ? 'is-active' : ''} ${o.value === current ? 'is-selected' : ''}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span>{o.label}</span>
                {o.value === current && <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </div>
  )
}
