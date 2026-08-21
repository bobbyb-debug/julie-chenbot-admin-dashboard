import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRelative, formatTimestamp } from "../lib/format.ts";

// formatTimestamp must convert a UTC instant into whatever timeZone
// is requested, parsing it exactly once (see lib/format.ts). These
// tests always pass an explicit timeZone so the result is
// deterministic regardless of the timezone the test runner's host
// machine (or CI) happens to be configured with.

test("UTC Z timestamp renders in Central Daylight Time (UTC-5)", () => {
  // 2026-08-21T03:00:00Z is 2026-08-20 22:00 in America/Chicago (CDT).
  const result = formatTimestamp("2026-08-21T03:00:00Z", { timeZone: "America/Chicago" });
  assert.equal(result, "Aug 20, 10:00 PM");
});

test("UTC Z timestamp renders in Central Standard Time (UTC-6) outside DST", () => {
  // 2026-01-15T03:00:00Z is 2026-01-14 21:00 in America/Chicago (CST, no DST in January).
  const result = formatTimestamp("2026-01-15T03:00:00Z", { timeZone: "America/Chicago" });
  assert.equal(result, "Jan 14, 9:00 PM");
});

test("date rolls over across midnight when converted to an earlier timezone", () => {
  // Just after local midnight in UTC is still the previous evening on
  // the US west coast -- exactly the kind of rollover a naive
  // "same-day" assumption would get wrong.
  const result = formatTimestamp("2026-03-02T04:30:00Z", { timeZone: "America/Los_Angeles" });
  assert.equal(result, "Mar 1, 8:30 PM");
});

test("date rolls forward across midnight when converted to a later timezone", () => {
  const result = formatTimestamp("2026-03-01T23:15:00Z", { timeZone: "Asia/Tokyo" });
  assert.equal(result, "Mar 2, 8:15 AM");
});

test("an explicit non-Z UTC offset resolves to the same instant as the equivalent Z timestamp", () => {
  const withOffset = formatTimestamp("2026-08-21T03:00:00+00:00", { timeZone: "America/Chicago" });
  const withZ = formatTimestamp("2026-08-21T03:00:00Z", { timeZone: "America/Chicago" });
  assert.equal(withOffset, withZ);
});

test("a timestamp already carrying a non-UTC offset converts correctly, not double-applied", () => {
  // 22:00 in UTC-5 is 03:00Z the next day, i.e. 21:00 the same day
  // converted to America/Denver (UTC-6 in August, MDT). If the offset
  // were applied twice this would land on the wrong day entirely.
  const result = formatTimestamp("2026-08-20T22:00:00-05:00", { timeZone: "America/Denver" });
  assert.equal(result, "Aug 20, 9:00 PM");
});

test("different viewers in different timezones see different local times for the same instant", () => {
  const instant = "2026-08-21T03:00:00Z";
  const chicago = formatTimestamp(instant, { timeZone: "America/Chicago" });
  const tokyo = formatTimestamp(instant, { timeZone: "Asia/Tokyo" });
  const utc = formatTimestamp(instant, { timeZone: "UTC" });

  assert.equal(chicago, "Aug 20, 10:00 PM");
  assert.equal(tokyo, "Aug 21, 12:00 PM");
  assert.equal(utc, "Aug 21, 3:00 AM");
  assert.notEqual(chicago, tokyo);
});

test("null/undefined render as 'never', not a formatted date", () => {
  assert.equal(formatTimestamp(null), "never");
  assert.equal(formatTimestamp(undefined), "never");
});

test("an unparseable value is returned unchanged rather than throwing or showing 'Invalid Date'", () => {
  assert.equal(formatTimestamp("not a date"), "not a date");
});

test("omitting timeZone still produces a valid, parseable formatted string (uses the runtime's local zone)", () => {
  const result = formatTimestamp("2026-08-21T03:00:00Z");
  assert.match(result, /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
});

test("formatRelative is timezone-independent -- only elapsed epoch time matters", () => {
  const now = Date.parse("2026-08-21T03:05:00Z");
  assert.equal(formatRelative("2026-08-21T03:04:56Z", now), "just now");
  assert.equal(formatRelative("2026-08-21T03:04:30Z", now), "30s ago");
  assert.equal(formatRelative("2026-08-21T03:00:00Z", now), "5m ago");
  assert.equal(formatRelative("2026-08-21T01:05:00Z", now), "2h ago");
  assert.equal(formatRelative("2026-08-15T03:05:00Z", now), "6d ago");
});

test("formatRelative falls back to an absolute timestamp beyond 30 days", () => {
  const now = Date.parse("2026-08-21T03:00:00Z");
  const result = formatRelative("2026-06-01T03:00:00Z", now);
  assert.match(result, /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
});

test("formatRelative handles null/undefined and unparseable values like formatTimestamp", () => {
  assert.equal(formatRelative(null), "never");
  assert.equal(formatRelative("garbage"), "garbage");
});
