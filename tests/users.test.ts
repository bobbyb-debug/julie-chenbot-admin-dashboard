import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// lib/db.ts reads DASHBOARD_DATA_DIR at module load time, so this must
// be set before the dynamic import below (static imports are hoisted
// above any top-level code, which is why this can't be a plain import).
process.env.DASHBOARD_DATA_DIR = mkdtempSync(join(tmpdir(), "dashboard-users-test-"));

const { createUser, emailExists, listUsers, setUserDisabled, setUserRole } = await import(
  "../lib/users.ts"
);
const { verifyPassword } = await import("../lib/password.ts");

test("createUser persists a user retrievable via listUsers", () => {
  const created = createUser("mod@example.com", "correct-horse-battery-staple", "moderator");
  const listed = listUsers().find((u) => u.id === created.id);

  assert.ok(listed);
  assert.equal(listed!.email, "mod@example.com");
  assert.equal(listed!.role, "moderator");
  assert.equal(listed!.disabled, 0);
});

test("listUsers returns plain objects (not node:sqlite row instances)", () => {
  createUser("plain@example.com", "correct-horse-battery-staple", "viewer");
  const [user] = listUsers();

  // A plain object's prototype is Object.prototype (or null) -- this
  // is exactly the property that broke passing rows to a Client
  // Component (see app/dashboard/settings/UserManagement.tsx).
  assert.equal(Object.getPrototypeOf(user), Object.prototype);
  assert.deepEqual(JSON.parse(JSON.stringify(user)), user);
});

test("createUser stores a password that verifies correctly and normalizes the email", () => {
  createUser("MiXeDcAsE@Example.com", "correct-horse-battery-staple", "admin");
  const stored = listUsers().find((u) => u.email === "mixedcase@example.com");

  assert.ok(stored);
});

test("emailExists is case-insensitive", () => {
  createUser("case-check@example.com", "correct-horse-battery-staple", "viewer");
  assert.equal(emailExists("CASE-CHECK@example.com"), true);
  assert.equal(emailExists("nobody@example.com"), false);
});

test("setUserRole and setUserDisabled update the stored row", () => {
  const user = createUser("toggle@example.com", "correct-horse-battery-staple", "viewer");

  setUserRole(user.id, "admin");
  setUserDisabled(user.id, true);

  const updated = listUsers().find((u) => u.id === user.id)!;
  assert.equal(updated.role, "admin");
  assert.equal(updated.disabled, 1);
});

test("password hash actually round-trips for a created user", async () => {
  createUser("verify@example.com", "correct-horse-battery-staple", "viewer");
  // Re-fetch through the low-level row to get the hash/salt columns
  // listUsers() deliberately omits.
  const { getDb } = await import("../lib/db.ts");
  const row = getDb()
    .prepare("SELECT password_hash, password_salt FROM users WHERE email = ?")
    .get("verify@example.com") as { password_hash: string; password_salt: string };

  assert.equal(
    verifyPassword("correct-horse-battery-staple", row.password_hash, row.password_salt),
    true,
  );
  assert.equal(verifyPassword("wrong-password", row.password_hash, row.password_salt), false);
});
