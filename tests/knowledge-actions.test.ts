import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleKnowledgeActions } from "../lib/knowledge-actions.ts";

// Lifecycle: ACTIVE -> Correct + Deactivate. DEACTIVATED -> Reactivate
// only. Reactivating flips `active` back to true, so this same
// function then returns Correct + Deactivate again automatically --
// there is no separate "correct a deactivated item" rule to keep in
// sync (Deactivated -> Reactivate -> Active -> Correct is one
// lifecycle driven by `item.active`).

test("active fact shows Correct and Deactivate, not Reactivate", () => {
  const actions = visibleKnowledgeActions({ active: true, type: "fact" }, true);
  assert.deepEqual(actions, { showCorrect: true, showDeactivate: true, showReactivate: false });
});

test("active rule shows Correct and Deactivate", () => {
  const actions = visibleKnowledgeActions({ active: true, type: "rule" }, true);
  assert.deepEqual(actions, { showCorrect: true, showDeactivate: true, showReactivate: false });
});

test("active correction shows Correct and Deactivate", () => {
  const actions = visibleKnowledgeActions({ active: true, type: "correction" }, true);
  assert.deepEqual(actions, { showCorrect: true, showDeactivate: true, showReactivate: false });
});

test("deactivated item shows only Reactivate, never Correct or Deactivate", () => {
  const actions = visibleKnowledgeActions({ active: false, type: "fact" }, true);
  assert.deepEqual(actions, { showCorrect: false, showDeactivate: false, showReactivate: true });
});

test("reactivating an item (active flips true) restores Correct + Deactivate automatically", () => {
  const beforeReactivate = visibleKnowledgeActions({ active: false, type: "fact" }, true);
  assert.equal(beforeReactivate.showReactivate, true);
  assert.equal(beforeReactivate.showCorrect, false);

  // Same function, same input shape -- only `active` changed, exactly
  // as it does when reactivateAction succeeds and the page re-fetches.
  const afterReactivate = visibleKnowledgeActions({ active: true, type: "fact" }, true);
  assert.deepEqual(afterReactivate, { showCorrect: true, showDeactivate: true, showReactivate: false });
});

test("active STATE item shows Deactivate but never Correct", () => {
  // STATE has its own Update State workflow -- a generic text
  // Correction on a STATE item would not change what /hoh etc. report.
  const actions = visibleKnowledgeActions({ active: true, type: "state" }, true);
  assert.deepEqual(actions, { showCorrect: false, showDeactivate: true, showReactivate: false });
});

test("deactivated STATE item shows only Reactivate, same as any other type", () => {
  const actions = visibleKnowledgeActions({ active: false, type: "state" }, true);
  assert.deepEqual(actions, { showCorrect: false, showDeactivate: false, showReactivate: true });
});

test("a non-moderator sees no actions regardless of status or type", () => {
  assert.deepEqual(visibleKnowledgeActions({ active: true, type: "fact" }, false), {
    showCorrect: false,
    showDeactivate: false,
    showReactivate: false,
  });
  assert.deepEqual(visibleKnowledgeActions({ active: false, type: "fact" }, false), {
    showCorrect: false,
    showDeactivate: false,
    showReactivate: false,
  });
});
