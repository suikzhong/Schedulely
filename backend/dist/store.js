import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const EMPTY_DB = {
    users: [],
    availabilityBlocks: [],
    sharedSpaces: [],
    sharedSpaceMembers: [],
    proposals: [],
    importLogs: [],
};
let inMemory = null;
async function persist(db) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}
export async function loadDb() {
    if (inMemory) {
        return inMemory;
    }
    try {
        const raw = await readFile(DATA_FILE, 'utf-8');
        inMemory = JSON.parse(raw);
    }
    catch {
        inMemory = structuredClone(EMPTY_DB);
        await persist(inMemory);
    }
    return inMemory;
}
export async function updateDb(mutator) {
    const db = await loadDb();
    mutator(db);
    await persist(db);
    return db;
}
