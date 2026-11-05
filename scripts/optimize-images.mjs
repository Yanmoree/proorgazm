// Готовит фото для сайта: кадрирует под пропорции блоков и сжимает в WebP двух размеров.
// Исходники — assets/originals, результат — public/images. Запуск: npm run images
import sharp from 'sharp'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, parse } from 'node:path'

const SRC = 'assets/originals'
const OUT = 'public/images'
const SIZES = [640, 1200]

// Пропорции блоков: мастера и первый экран — 4:5, «О салоне» — 4:5 и 1:1
const jobs = [
  { dir: 'masters', ratio: 4 / 5 },
  { dir: 'atmosphere', ratio: 4 / 5 },
  { dir: 'atmosphere', ratio: 1, suffix: '-square', only: ['atmosphere-4'] },
]

let total = 0
for (const job of jobs) {
  const outDir = join(OUT, job.dir)
  mkdirSync(outDir, { recursive: true })
  for (const file of readdirSync(join(SRC, job.dir))) {
    const { name } = parse(file)
    if (job.only && !job.only.includes(name)) continue
    for (const w of SIZES) {
      const h = Math.round(w / job.ratio)
      const out = join(outDir, `${name}${job.suffix || ''}-${w}.webp`)
      await sharp(join(SRC, job.dir, file))
        .rotate()
        .resize(w, h, { fit: 'cover', position: sharp.strategy.attention, withoutEnlargement: false })
        .webp({ quality: 80, effort: 6, smartSubsample: true })
        .toFile(out)
      total += statSync(out).size
    }
  }
}

// Лого: в шапке 44px, для ретины — 96px; favicon — 64px
await sharp(join(SRC, 'logo.png')).resize(96, 96).webp({ quality: 90 }).toFile(join(OUT, 'logo-96.webp'))
// Экран загрузки: 128px на экране, 256px для ретины
await sharp(join(SRC, 'logo.png')).resize(256, 256).webp({ quality: 90 }).toFile(join(OUT, 'logo-256.webp'))
await sharp(join(SRC, 'logo.png')).resize(64, 64).png({ compressionLevel: 9 }).toFile('public/favicon.png')
await sharp(join(SRC, 'logo.png')).resize(180, 180).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png')

// Иконка MAX: белый силуэт, на сайте используется как маска и красится цветом кнопки
mkdirSync(join(OUT, 'icons'), { recursive: true })
await sharp(join(SRC, 'icons', 'max.png')).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 }).toFile(join(OUT, 'icons', 'max-128.png'))

console.log(`Готово: ${(total / 1024).toFixed(0)} КБ фото`)
