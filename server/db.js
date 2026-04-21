import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "history.db");

const db = new Database(DB_PATH);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdAt TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    channel TEXT,
    duration TEXT,
    source TEXT,
    transcript TEXT,
    summary TEXT
  )
`);

export default db;
