import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seed, migrateV2, migrateV3, migrateV4, migrateV5, migrateV6 } from './seed.js'

const here = dirname(fileURLToPath(import.meta.url))
export const DB_PATH = process.env.DB_PATH || join(here, 'data', 'proorgazm.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Массажи, мастера, статьи: общая таблица, поля контента в JSON
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (collection, slug)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    master TEXT,
    text TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    path TEXT,
    label TEXT,
    vid TEXT,
    device TEXT,
    referrer TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_time ON events (created_at);

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
`)

db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
const SCHEMA_VERSION = 6
const empty = db.prepare('SELECT COUNT(*) AS n FROM items').get().n === 0
const version = Number(db.prepare("SELECT value FROM meta WHERE key = 'version'").get()?.value || 1)
if (empty) seed(db)
else {
  if (version < 2) migrateV2(db)
  if (version < 3) migrateV3(db)
  if (version < 4) migrateV4(db)
  if (version < 5) migrateV5(db)
  if (version < 6) migrateV6(db)
}
db.prepare("INSERT INTO meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(SCHEMA_VERSION))

// --- хелперы ---

const parseItem = (row) => row && {
  id: row.id,
  slug: row.slug,
  sort: row.sort,
  published: !!row.published,
  ...JSON.parse(row.data),
  updatedAt: row.updated_at,
}

export function listItems(collection, { all = false } = {}) {
  const rows = db
    .prepare(`SELECT * FROM items WHERE collection = ? ${all ? '' : 'AND published = 1'} ORDER BY sort, id`)
    .all(collection)
  return rows.map(parseItem)
}

export function getItem(collection, by, { all = false } = {}) {
  const col = typeof by === 'number' ? 'id' : 'slug'
  const row = db
    .prepare(`SELECT * FROM items WHERE collection = ? AND ${col} = ? ${all ? '' : 'AND published = 1'}`)
    .get(collection, by)
  return parseItem(row)
}

export function getSettings() {
  const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('site')
  return row ? JSON.parse(row.data) : {}
}
