#!/usr/bin/env node
// Bootstraps the first (or an additional) dashboard user account.
// Usage: node scripts/create-admin.ts <email> <password> [role]
//
// Deliberately self-contained (no imports from ../lib) so it runs
// reliably under plain `node` regardless of module resolution mode --
// this is the one script meant to be run outside the Next.js app.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , email, password, roleArg] = process.argv;
const role = roleArg ?? "admin";

if (!email || !email.includes("@") || !password) {
  console.error("Usage: node scripts/create-admin.ts <email> <password> [viewer|moderator|admin]");
  process.exit(1);
}
if (!["viewer", "moderator", "admin"].includes(role)) {
  console.error(`Invalid role: ${role}`);
  process.exit(1);
}
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const dataDir = process.env.DASHBOARD_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "dashboard.db"));
db.exec(`
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

const normalizedEmail = email.trim().toLowerCase();
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
if (existing) {
  console.error(`A user with email ${normalizedEmail} already exists.`);
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

const result = db
  .prepare(
    "INSERT INTO users (email, password_hash, password_salt, role, disabled, created_at) VALUES (?, ?, ?, ?, 0, ?)",
  )
  .run(normalizedEmail, hash, salt, role, new Date().toISOString());

console.log(`Created ${role} user: ${normalizedEmail} (id ${result.lastInsertRowid})`);
