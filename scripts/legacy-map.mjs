// Карта старых адресов для php/legacy.php (берётся из src/lib/routes.js, чтобы не дублировать)
import { writeFileSync } from 'node:fs'
import { SLUG_RENAMES } from '../src/lib/routes.js'
writeFileSync(process.argv[2] || 'dist/legacy-map.json', JSON.stringify(SLUG_RENAMES))
