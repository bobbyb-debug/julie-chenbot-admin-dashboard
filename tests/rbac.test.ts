import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRole } from "../lib/rbac.ts";

test("a role always satisfies its own minimum", () => {
  assert.equal(hasRole("viewer", "viewer"), true);
  assert.equal(hasRole("moderator", "moderator"), true);
  assert.equal(hasRole("admin", "admin"), true);
});

test("higher roles satisfy lower minimums", () => {
  assert.equal(hasRole("admin", "viewer"), true);
  assert.equal(hasRole("admin", "moderator"), true);
  assert.equal(hasRole("moderator", "viewer"), true);
});

test("lower roles do not satisfy higher minimums", () => {
  assert.equal(hasRole("viewer", "moderator"), false);
  assert.equal(hasRole("viewer", "admin"), false);
  assert.equal(hasRole("moderator", "admin"), false);
});
