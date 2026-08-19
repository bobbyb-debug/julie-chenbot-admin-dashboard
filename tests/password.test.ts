import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, isPasswordStrongEnough, verifyPassword } from "../lib/password.ts";

test("hashPassword produces a hash the original password verifies against", () => {
  const { hash, salt } = hashPassword("correct-horse-battery-staple");
  assert.equal(verifyPassword("correct-horse-battery-staple", hash, salt), true);
});

test("verifyPassword rejects a wrong password", () => {
  const { hash, salt } = hashPassword("correct-horse-battery-staple");
  assert.equal(verifyPassword("wrong-password", hash, salt), false);
});

test("two hashes of the same password use different salts", () => {
  const a = hashPassword("correct-horse-battery-staple");
  const b = hashPassword("correct-horse-battery-staple");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test("isPasswordStrongEnough enforces the minimum length", () => {
  assert.equal(isPasswordStrongEnough("short"), false);
  assert.equal(isPasswordStrongEnough("exactly-12-c"), true);
});
