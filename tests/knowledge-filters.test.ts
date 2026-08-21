import { test } from "node:test";
import assert from "node:assert/strict";
import { activeQueryValue, resolveActiveFilter } from "../lib/knowledge-filters.ts";

test("resolveActiveFilter defaults to Active when no ?active= param is present", () => {
  assert.equal(resolveActiveFilter(undefined), "true");
});

test("resolveActiveFilter honors an explicit deactivated filter", () => {
  assert.equal(resolveActiveFilter("false"), "false");
});

test("resolveActiveFilter honors an explicit all filter", () => {
  assert.equal(resolveActiveFilter("all"), "all");
});

test("resolveActiveFilter treats an explicit true the same as the default", () => {
  assert.equal(resolveActiveFilter("true"), "true");
});

test("resolveActiveFilter falls back to Active for any unrecognized value", () => {
  assert.equal(resolveActiveFilter("garbage"), "true");
});

test("activeQueryValue passes Active/Deactivated straight through to the API filter", () => {
  assert.equal(activeQueryValue("true"), "true");
  assert.equal(activeQueryValue("false"), "false");
});

test("activeQueryValue omits the filter entirely for All, so the API returns every record", () => {
  assert.equal(activeQueryValue("all"), undefined);
});
