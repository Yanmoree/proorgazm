// Создаёт чистую базу для продакшена (контент из src/data/site.js + рейтинг DIKIDI) по пути из аргумента.
// node --no-warnings scripts/build-db.mjs ./prod.db
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

const out = resolve(process.argv[2] || 'prod.db')
if (existsSync(out)) { console.error(`Файл уже есть: ${out}`); process.exit(1) }
process.env.DB_PATH = out
const { db } = await import('../server/db.js')
const { refreshRatingStats } = await import('../server/dikidi.js')
console.log('DIKIDI:', await refreshRatingStats())
// Один файл без -wal/-shm: так его проще залить на хостинг
db.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;')
db.close()
console.log(`База: ${out}`)
