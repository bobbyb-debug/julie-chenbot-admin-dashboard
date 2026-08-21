import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStateWhyView, isCurrentTaughtRecord } from "../lib/state-why-view.ts";
import type { KnowledgeItem } from "../lib/julie-types.ts";

function taughtItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 1,
    type: "state",
    content: "LaLa, Taylor, Mallory",
    author_id: 1001,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    active: true,
    supersedes: null,
    topic: "HAVE_NOTS",
    note: null,
    ...overrides,
  };
}

// Test 1 -- a taught STATE record must be recognized as the current
// value, never reported as "not taught" merely because a *different*
// system (the live feed) also exists.
test("an explicitly taught active STATE record is recognized as the current taught value", () => {
  const view = buildStateWhyView({
    current_state: taughtItem({ content: "LaLa, Taylor, Mallory" }),
    house_status_value: "",
  });
  assert.equal(view.currentTaughtValue, "LaLa, Taylor, Mallory");
});

// Test 2 -- the live feed disagreeing with taught Knowledge is
// informational, not a merge: both values remain independently
// intact and visible.
test("taught value and a disagreeing live-feed observation both remain visible, neither overwrites the other", () => {
  const view = buildStateWhyView({
    current_state: taughtItem({ content: "LaLa, Taylor, Mallory" }),
    house_status_value: "Angela, Taylor, Drew",
  });
  assert.equal(view.currentTaughtValue, "LaLa, Taylor, Mallory");
  assert.equal(view.liveFeedValue, "Angela, Taylor, Drew");
  assert.equal(view.differs, true);
  assert.equal(view.showLiveFeed, true);
});

// Test 5 -- with no taught record at all, "Not taught" is the
// correct answer (this is the one case it's actually true).
test("with no taught record and no live-feed observation, there is genuinely nothing taught", () => {
  const view = buildStateWhyView({ current_state: null, house_status_value: "" });
  assert.equal(view.currentTaughtValue, null);
  assert.equal(view.showLiveFeed, false);
});

// Test 8 -- the live feed observing something the admin never taught
// must never be reported as taught Knowledge.
test("a live-feed-only observation (nothing taught) is shown as live feed, never as a taught value", () => {
  const view = buildStateWhyView({ current_state: null, house_status_value: "Angela, Taylor, Drew" });
  assert.equal(view.currentTaughtValue, null);
  assert.equal(view.liveFeedValue, "Angela, Taylor, Drew");
  assert.equal(view.showLiveFeed, true);
  // Not a "differs" conflict -- there's nothing taught to disagree with yet.
  assert.equal(view.differs, false);
});

test("a taught value that happens to match the live feed is shown without conflict framing", () => {
  const view = buildStateWhyView({
    current_state: taughtItem({ content: "LaLa, Taylor, Mallory" }),
    house_status_value: "lala, taylor, mallory",
  });
  assert.equal(view.showLiveFeed, true);
  assert.equal(view.differs, false);
});

test("a topic with no live-feed equivalent (e.g. LAST_HOUSEGUEST_EVICTED) shows no live-feed section at all", () => {
  const view = buildStateWhyView({
    current_state: taughtItem({ topic: "LAST_HOUSEGUEST_EVICTED", content: "Kamu" }),
    house_status_value: "",
  });
  assert.equal(view.currentTaughtValue, "Kamu");
  assert.equal(view.showLiveFeed, false);
});

// ==========================================================
// isCurrentTaughtRecord() -- Test 6: a reactivated older record must
// be recognized as current by its `active` flag, not by its position
// in a chronologically-sorted history list (see the doc comment on
// isCurrentTaughtRecord for why position is unsafe after a reactivate).
// ==========================================================

test("isCurrentTaughtRecord recognizes an active record regardless of its position in history", () => {
  assert.equal(isCurrentTaughtRecord({ active: true }), true);
});

test("isCurrentTaughtRecord does not recognize a deactivated record even if it sorts last by created_at", () => {
  assert.equal(isCurrentTaughtRecord({ active: false }), false);
});

// Test 3/4 -- current-vs-history is a property of build_plan()/
// KnowledgeStore.teach()'s auto-supersede-by-topic (JulieChenBot repo,
// production/knowledge.py), already covered end-to-end by that repo's
// own test suite (tests/test_knowledge.py). What the dashboard adds on
// top -- distinguishing the taught stream from the live feed, and
// picking the current record out of a history list correctly -- is
// what buildStateWhyView()/isCurrentTaughtRecord() above cover.
