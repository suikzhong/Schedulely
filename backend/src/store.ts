import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Database } from './types.js'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

const EMPTY_DB: Database = {
  users: [],
  availabilityBlocks: [],
  sharedSpaces: [],
  sharedSpaceMembers: [],
  proposals: [],
  importLogs: [],
}

let inMemory: Database | null = null

async function persist(db: Database): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8')
}

export async function loadDb(): Promise<Database> {
  if (inMemory) {
    return inMemory
  }

  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    inMemory = JSON.parse(raw) as Database
  } catch {
    inMemory = structuredClone(EMPTY_DB)
    await persist(inMemory)
  }

  return inMemory
}

export async function updateDb(mutator: (current: Database) => void): Promise<Database> {
  const db = await loadDb()
  mutator(db)
  await persist(db)
  return db
}
