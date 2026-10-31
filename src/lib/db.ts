import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

// Üks ühendus kogu protsessi kohta (dev-režiimis säilib see ka hot reloadi üle)
const globalForDb = globalThis as unknown as { __academyDb?: Database.Database };

export const db = globalForDb.__academyDb ?? new Database(path.join(dataDir, "academy.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") globalForDb.__academyDb = db;
