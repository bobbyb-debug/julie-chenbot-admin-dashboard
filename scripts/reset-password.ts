#!/usr/bin/env node
// Resets an existing dashboard user's password (e.g. after losing it --
// passwords are scrypt-hashed and cannot be recovered, only replaced).
// Usage: node scripts/reset-password.ts <email> <new-password>
//
// Deliberately self-contained (no imports from ../lib), matching
// scripts/create-admin.ts -- this is meant to run reliably under plain
// `node` regardless of module resolution mode, outside the Next.js app.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , email, password] = process.argv;

if (!email || !email.includes("@") || !password) {
  console.error("Usage: node scripts/reset-password.ts <email> <new-password>");
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
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as
  | { id: number }
  | undefined;

if (!existing) {
  console.error(`No user with email ${normalizedEmail} exists.`);
  process.exit(1);
}

// Same scrypt approach as lib/password.ts hashPassword() -- 16-byte
// random salt, 64-byte derived key, both stored as hex. A fresh salt
// every time, never reused from the old password.
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").run(
  hash,
  salt,
  existing.id,
);

// Never print or log the password itself -- only confirm the action.
console.log(`Password reset for ${normalizedEmail} (id ${existing.id}).`);
