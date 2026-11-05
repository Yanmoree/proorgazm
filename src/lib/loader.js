import { lockScroll } from './smooth.js'

// Экран загрузки из index.html: ждём шрифты и главное фото и даём анимации доиграть до конца.
// Первый визит: анимация ~1,9 с + пауза → 2,7 с. Повторный в той же вкладке: ускоренная анимация ~1,1 с → 1,6 с.
// Даже на медленной сети не держим дольше 5 с.
const MIN_FIRST = 2700
const MIN_REPEAT = 1600
const MAX = 5000
const FADE = 900
const SEEN_KEY = 'po-loader-seen'

let resolveDone
const done = new Promise((r) => { resolveDone = r })
export const whenLoaderDone = () => done

const seenBefore = () => {
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}

const imageReady = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve()
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export function finishLoader({ heroSrc } = {}) {
  const el = document.getElementById('po-loader')
  if (!el) return resolveDone()

  lockScroll('loader', true)
  const min = el.classList.contains('is-quick') || seenBefore() ? MIN_REPEAT : MIN_FIRST
  const elapsed = performance.now() - (window.__poLoaderStart || 0)
  // Ждём и фактическое окончание анимаций: на слабом устройстве они могут идти медленнее расписания
  const introDone = Promise.all(
    el.getAnimations?.({ subtree: true })
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => {})) || [],
  ).then(() => wait(500))
  const ready = Promise.all([document.fonts?.ready, imageReady(heroSrc), wait(Math.max(0, min - elapsed)), introDone])

  Promise.race([ready, wait(Math.max(min, MAX - elapsed))]).then(() => {
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* приватный режим */ }
    el.classList.add('is-done')
    lockScroll('loader', false)
    // Анимации сайта стартуют, когда экран загрузки почти растворился
    setTimeout(resolveDone, FADE * 0.45)
    setTimeout(() => el.remove(), FADE + 100)
  })
}
