// Хеш пароля админки для ADMIN_PASS_HASH или server/auth.js: node scripts/hash-password.mjs 'пароль'
import { randomBytes, scryptSync } from 'node:crypto'

const pass = process.argv[2]
if (!pass) {
  console.error("Использование: node scripts/hash-password.mjs 'пароль'")
  process.exit(1)
}
const N = 2 ** 15, r = 8, p = 1
const salt = randomBytes(16)
const hash = scryptSync(pass, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 })
console.log(['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$'))
