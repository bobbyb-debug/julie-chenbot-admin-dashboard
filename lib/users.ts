import { getDb } from "./db.ts";
import { hashPassword } from "./password.ts";
import type { Role } from "./session.ts";

export interface UserRow {
  id: number;
  email: string;
  role: Role;
  disabled: number;
  created_at: string;
}

export function listUsers(): UserRow[] {
  const rows = getDb()
    .prepare("SELECT id, email, role, disabled, created_at FROM users ORDER BY id ASC")
    .all() as unknown as UserRow[];

  // node:sqlite rows aren't plain objects (can't cross the Server ->
  // Client Component boundary as-is) -- rebuild them plainly.
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    disabled: row.disabled,
    created_at: row.created_at,
  }));
}

export function countUsers(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count;
}

export function createUser(email: string, password: string, role: Role): UserRow {
  const { hash, salt } = hashPassword(password);
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO users (email, password_hash, password_salt, role, disabled, created_at) VALUES (?, ?, ?, ?, 0, ?)",
    )
    .run(email.trim().toLowerCase(), hash, salt, role, new Date().toISOString());

  return db
    .prepare("SELECT id, email, role, disabled, created_at FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as UserRow;
}

export function setUserRole(userId: number, role: Role): void {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

export function setUserDisabled(userId: number, disabled: boolean): void {
  getDb().prepare("UPDATE users SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, userId);
}

export function emailExists(email: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());
  return row !== undefined;
}
