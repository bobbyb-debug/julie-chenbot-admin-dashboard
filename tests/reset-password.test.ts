import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPassword } from "../lib/password.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESET_SCRIPT = join(REPO_ROOT, "scripts", "reset-password.ts");
const CREATE_SCRIPT = join(REPO_ROOT, "scripts", "create-admin.ts");

// scripts/reset-password.ts is deliberately self-contained (no imports
// from ../lib) so it runs reliably under plain `node`, same as
// scripts/create-admin.ts -- so it's exercised here as a real
// subprocess with a real DASHBOARD_DATA_DIR, not by importing its
// internals, which is the only way to genuinely test a CLI script's
// actual argv/exit-code/stdout/stderr contract.

function runScript(script: string, args: string[], dataDir: string) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, DASHBOARD_DATA_DIR: dataDir },
    encoding: "utf8",
  });
}

function freshDataDir(): string {
  return mkdtempSync(join(tmpdir(), "dashboard-reset-password-test-"));
}

function readUser(dataDir: string, email: string) {
  const db = new DatabaseSync(join(dataDir, "dashboard.db"));
  const row = db
    .prepare("SELECT id, email, password_hash, password_salt, role, disabled FROM users WHERE email = ?")
    .get(email) as
    | { id: number; email: string; password_hash: string; password_salt: string; role: string; disabled: number }
    | undefined;
  db.close();
  return row;
}

test("successfully resets a password for an existing user", () => {
  const dataDir = freshDataDir();
  const created = runScript(
    CREATE_SCRIPT,
    ["reset-target@example.com", "original-password-1", "viewer"],
    dataDir,
  );
  assert.equal(created.status, 0, created.stderr);

  const result = runScript(RESET_SCRIPT, ["reset-target@example.com", "brand-new-password-99"], dataDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Password reset for reset-target@example\.com/);
});

test("refuses to operate on a nonexistent email", () => {
  const dataDir = freshDataDir();

  const result = runScript(RESET_SCRIPT, ["nobody@example.com", "some-long-password-1"], dataDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /No user with email nobody@example\.com exists\./);
});

test("rejects a password shorter than 12 characters and leaves the user untouched", () => {
  const dataDir = freshDataDir();
  runScript(CREATE_SCRIPT, ["short-pw@example.com", "original-password-1", "viewer"], dataDir);
  const before = readUser(dataDir, "short-pw@example.com");

  const result = runScript(RESET_SCRIPT, ["short-pw@example.com", "short11chr"], dataDir);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /at least 12 characters/);
  const after = readUser(dataDir, "short-pw@example.com");
  assert.deepEqual(after, before);
});

test("looks up the user case-insensitively", () => {
  const dataDir = freshDataDir();
  runScript(CREATE_SCRIPT, ["Case@Example.com", "original-password-1", "viewer"], dataDir);

  const result = runScript(RESET_SCRIPT, ["CASE@EXAMPLE.COM", "new-password-case-1"], dataDir);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Password reset for case@example\.com/);
});

test("the newly reset password verifies successfully, matching how login checks it", () => {
  const dataDir = freshDataDir();
  runScript(CREATE_SCRIPT, ["login-check@example.com", "original-password-1", "moderator"], dataDir);
  runScript(RESET_SCRIPT, ["login-check@example.com", "the-new-correct-password"], dataDir);

  const row = readUser(dataDir, "login-check@example.com");
  assert.ok(row);
  assert.equal(verifyPassword("the-new-correct-password", row.password_hash, row.password_salt), true);
});

test("the old password no longer verifies after a reset", () => {
  const dataDir = freshDataDir();
  runScript(CREATE_SCRIPT, ["old-pw@example.com", "the-original-password-1", "admin"], dataDir);
  runScript(RESET_SCRIPT, ["old-pw@example.com", "the-replacement-password"], dataDir);

  const row = readUser(dataDir, "old-pw@example.com");
  assert.ok(row);
  assert.equal(verifyPassword("the-original-password-1", row.password_hash, row.password_salt), false);
});

test("never prints the new password to stdout or stderr", () => {
  const dataDir = freshDataDir();
  const secretPassword = "super-secret-do-not-leak-1";
  runScript(CREATE_SCRIPT, ["quiet@example.com", "original-password-1", "viewer"], dataDir);

  const result = runScript(RESET_SCRIPT, ["quiet@example.com", secretPassword], dataDir);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.includes(secretPassword), false);
  assert.equal(result.stderr.includes(secretPassword), false);
});

test("does not change role or disabled state -- only the password", () => {
  const dataDir = freshDataDir();
  runScript(CREATE_SCRIPT, ["role-check@example.com", "original-password-1", "moderator"], dataDir);

  runScript(RESET_SCRIPT, ["role-check@example.com", "a-completely-new-password"], dataDir);

  const row = readUser(dataDir, "role-check@example.com");
  assert.ok(row);
  assert.equal(row.role, "moderator");
  assert.equal(row.disabled, 0);
});
