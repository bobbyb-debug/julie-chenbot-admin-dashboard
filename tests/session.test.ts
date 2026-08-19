process.env.SESSION_SECRET = "a".repeat(32);

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createSessionToken, verifySessionToken } from "../lib/session.ts";

function signWithTestSecret(body: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(body).digest("base64url");
}

test("a freshly created token verifies and round-trips its payload", () => {
  const token = createSessionToken({ sub: 1, email: "bobby@example.com", role: "admin" });
  const payload = verifySessionToken(token);
  assert.ok(payload);
  assert.equal(payload!.sub, 1);
  assert.equal(payload!.email, "bobby@example.com");
  assert.equal(payload!.role, "admin");
});

test("a tampered payload is rejected", () => {
  const token = createSessionToken({ sub: 1, email: "bobby@example.com", role: "viewer" });
  const [body, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ sub: 1, email: "bobby@example.com", role: "admin", exp: 9999999999 }),
  ).toString("base64url");
  assert.equal(verifySessionToken(`${tamperedPayload}.${signature}`), null);
  assert.notEqual(body, tamperedPayload);
});

test("a tampered signature is rejected", () => {
  const token = createSessionToken({ sub: 1, email: "bobby@example.com", role: "viewer" });
  const [body] = token.split(".");
  assert.equal(verifySessionToken(`${body}.not-a-real-signature`), null);
});

test("an expired token is rejected even with a correctly matching signature", () => {
  const expiredPayload = {
    sub: 1,
    email: "bobby@example.com",
    role: "viewer",
    exp: Math.floor(Date.now() / 1000) - 10,
  };
  const body = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const token = `${body}.${signWithTestSecret(body)}`;

  assert.equal(verifySessionToken(token), null);
});

test("garbage input never throws", () => {
  assert.equal(verifySessionToken(undefined), null);
  assert.equal(verifySessionToken(""), null);
  assert.equal(verifySessionToken("not-a-token"), null);
  assert.equal(verifySessionToken("a.b.c"), null);
});
