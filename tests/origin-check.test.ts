import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOriginRequest } from "../lib/origin-check.ts";

function req(url: string, origin: string | null): Request {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  return new Request(url, { method: "POST", headers });
}

test("matching origin and request URL is same-origin", () => {
  assert.equal(
    isSameOriginRequest(req("https://dashboard.example.com/api/x", "https://dashboard.example.com")),
    true,
  );
});

test("a different origin is rejected", () => {
  assert.equal(
    isSameOriginRequest(req("https://dashboard.example.com/api/x", "https://evil.example.com")),
    false,
  );
});

test("a missing origin header is rejected", () => {
  assert.equal(isSameOriginRequest(req("https://dashboard.example.com/api/x", null)), false);
});
