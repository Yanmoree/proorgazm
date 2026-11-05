import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis = null

// Мягкий инерционный скролл (Lenis), синхронизированный с GSAP ScrollTrigger
export function startSmoothScroll() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time) => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  applyLock()
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

// Несколько источников блокировки (18+, мобильное меню) не должны снимать блокировку друг друга
const locks = new Set()

function applyLock() {
  const locked = locks.size > 0
  document.body.classList.toggle('lock', locked)
  if (lenis) locked ? lenis.stop() : lenis.start()
}

export function lockScroll(key, locked) {
  locked ? locks.add(key) : locks.delete(key)
  applyLock()
}
