import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// put DB file in backend/db/data.sqlite3 by default
const dbPath =
  process.env.DB_PATH || path.join(__dirname, "data.sqlite3");

const db = new Database(dbPath);

// Good defaults
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;


