import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// The dashboard's own local data (user accounts, audit log) -- entirely
// separate from Julie's storage.json/SQLite files, which are only ever
// reached through the admin API (see lib/julie-client.ts). Losing this
// file loses dashboard logins and audit history, never any Big Brother
// game state or knowledge.
const DATA_DIR = process.env.DASHBOARD_DATA_DIR || join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "dashboard.db");

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;

  instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec("PRAGMA foreign_keys = ON;");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('viewer','moderator','admin')),
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  instance.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      object TEXT,
      detail TEXT,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  instance.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return instance;
}
