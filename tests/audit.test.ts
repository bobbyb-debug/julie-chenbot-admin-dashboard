import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DASHBOARD_DATA_DIR = mkdtempSync(join(tmpdir(), "dashboard-audit-test-"));

const { listAudit, recordAudit } = await import("../lib/audit.ts");

test("recordAudit entries are retrievable via listAudit, newest first", () => {
  recordAudit({ email: "bobby@example.com", role: "admin" }, { action: "login", result: "success" });
  recordAudit(
    { email: "bobby@example.com", role: "admin" },
    { action: "forget_knowledge", object: "knowledge#3", result: "success" },
  );

  const entries = listAudit();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].action, "forget_knowledge");
  assert.equal(entries[0].object, "knowledge#3");
  assert.equal(entries[1].action, "login");
});

test("listAudit returns plain objects", () => {
  recordAudit({ email: "x@example.com", role: "viewer" }, { action: "login", result: "failure" });
  const [entry] = listAudit();

  assert.equal(Object.getPrototypeOf(entry), Object.prototype);
  assert.deepEqual(JSON.parse(JSON.stringify(entry)), entry);
});

test("listAudit respects its limit", () => {
  for (let i = 0; i < 5; i++) {
    recordAudit({ email: "bulk@example.com", role: "viewer" }, { action: "login", result: "success" });
  }
  assert.equal(listAudit(3).length, 3);
});
