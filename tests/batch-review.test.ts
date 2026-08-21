import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSelectedLines, reviewBatchLines, summarizeBatchReview } from "../lib/batch-review.ts";

// Minimal fixtures shaped like the real API responses (KnowledgeItem /
// PlanLine, see lib/julie-types.ts) -- only the fields reviewBatchLines
// actually reads.

function knowledgeItem(overrides: Partial<{
  id: number; type: string; content: string; topic: string | null; active: boolean;
}>) {
  return {
    id: 1, type: "fact", content: "", topic: null, active: true,
    ...overrides,
  } as { id: number; type: "fact" | "rule" | "correction" | "state"; content: string; topic: string | null; active: boolean };
}

function planLine(overrides: Partial<{
  line_number: number; type: string | null; content: string; topic: string | null;
}>) {
  return {
    line_number: 1, type: "fact", content: "", topic: null,
    ...overrides,
  } as { line_number: number; type: "fact" | "rule" | "correction" | "state" | null; content: string; topic: string | null };
}

test("a fact with no resemblance to existing knowledge is classified as new", () => {
  const existing = [knowledgeItem({ id: 1, type: "fact", content: "Yash is the current HOH." })];
  const lines = [planLine({ line_number: 1, type: "fact", content: "The Mosh Pit alliance includes Devens." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "new");
  assert.equal(review.matchedItemId, undefined);
});

test("an exact duplicate of an existing active fact is classified as duplicate and points at it", () => {
  const existing = [knowledgeItem({ id: 15, type: "fact", content: "Devens used the Diamond Power of Veto to remove Dee from the block." })];
  const lines = [planLine({ line_number: 1, type: "fact", content: "Devens used the Diamond Power of Veto to remove Dee from the block." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "duplicate");
  assert.equal(review.matchedItemId, 15);
});

test("a reworded (normalized) duplicate of an existing fact is still classified as duplicate", () => {
  const existing = [knowledgeItem({ id: 20, type: "fact", content: "The Diamond Power of Veto was used by Devens to remove Dee from the block." })];
  const lines = [planLine({ line_number: 1, type: "fact", content: "Devens used the Diamond Power of Veto to remove Dee from the block." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "duplicate");
  assert.equal(review.matchedItemId, 20);
});

test("a partially overlapping (but not restated) fact is classified as possible_overlap", () => {
  const existing = [
    knowledgeItem({ id: 16, type: "fact", content: "Kamu was named as the replacement nominee after Devens used the Diamond Power of Veto." }),
  ];
  const lines = [
    planLine({ line_number: 1, type: "fact", content: "Kamu became the replacement nominee as a result of the Diamond Power of Veto ceremony." }),
  ];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "possible_overlap");
  assert.equal(review.matchedItemId, 16);
});

test("a negated restatement of an existing active fact is classified as a contradiction", () => {
  const existing = [knowledgeItem({ id: 17, type: "fact", content: "Yash did use the Power of Veto." })];
  const lines = [planLine({ line_number: 1, type: "fact", content: "Yash did not use the Power of Veto." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "contradiction");
  assert.equal(review.matchedItemId, 17);
});

test("a contradiction is chosen over a higher-scoring but non-contradicting match", () => {
  // Both existing items share generic connector words ("did", "not")
  // with the proposed line, and #18 scores higher on raw token
  // overlap than #17 -- but #18 is *also* negated (not a
  // contradiction), while #17 is the one this line actually
  // disagrees with. The review must not let #18's higher similarity
  // score bury the real contradiction.
  const existing = [
    knowledgeItem({ id: 17, type: "fact", content: "Yash won the regular Power of Veto." }),
    knowledgeItem({ id: 18, type: "fact", content: "Yash did not use the Golden Power of Veto." }),
  ];
  const lines = [planLine({ line_number: 1, type: "fact", content: "Yash did not win the regular Power of Veto." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "contradiction");
  assert.equal(review.matchedItemId, 17);
});

test("a fact that resembles a DEACTIVATED item is not flagged -- deactivated knowledge is not compared against", () => {
  const existing = [knowledgeItem({ id: 4, type: "fact", content: "Nominees are Angela, Dee, Haley.", active: false })];
  const lines = [planLine({ line_number: 1, type: "fact", content: "Nominees are Angela, Dee, Haley." })];

  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "new");
});

test("a rule is compared against existing rules the same way a fact is", () => {
  const existing = [knowledgeItem({ id: 22, type: "rule", content: "Do not treat a live-feed observation as authoritative when it conflicts with confirmed Official Game State." })];
  const lines = [planLine({ line_number: 1, type: "rule", content: "Do not treat live-feed observations as authoritative when they conflict with confirmed Official Game State." })];

  // Singular/plural rewording ("observation" vs "observations") means
  // this is a near-duplicate, not a literal exact match -- still
  // caught, just at the possible_duplicate tier rather than duplicate.
  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "possible_duplicate");
  assert.equal(review.matchedItemId, 22);
});

test("a STATE line for a topic with no existing value is classified state_new", () => {
  const lines = [planLine({ line_number: 1, type: "state", topic: "HOH", content: "Yash" })];
  const [review] = reviewBatchLines(lines, []);
  assert.equal(review.classification, "state_new");
  assert.equal(review.previousValue, null);
});

test("a STATE line matching the current active value is classified state_unchanged", () => {
  const existing = [knowledgeItem({ id: 8, type: "state", topic: "HOH", content: "Yash" })];
  const lines = [planLine({ line_number: 1, type: "state", topic: "HOH", content: "Yash" })];
  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "state_unchanged");
  assert.equal(review.previousValue, "Yash");
});

test("a STATE line changing the current active value is classified state_update, never duplicate/contradiction", () => {
  const existing = [knowledgeItem({ id: 8, type: "state", topic: "HOH", content: "Yash" })];
  const lines = [planLine({ line_number: 1, type: "state", topic: "HOH", content: "Angela" })];
  const [review] = reviewBatchLines(lines, existing);
  assert.equal(review.classification, "state_update");
  assert.equal(review.previousValue, "Yash");
});

test("multiple STATE updates for different topics in one batch classify independently", () => {
  const existing = [
    knowledgeItem({ id: 8, type: "state", topic: "HOH", content: "Yash" }),
    knowledgeItem({ id: 12, type: "state", topic: "VETO_WINNER", content: "Yash" }),
  ];
  const lines = [
    planLine({ line_number: 1, type: "state", topic: "HOH", content: "Angela" }),
    planLine({ line_number: 2, type: "state", topic: "VETO_WINNER", content: "Yash" }),
    planLine({ line_number: 3, type: "state", topic: "LAST_HOUSEGUEST_EVICTED", content: "Kamu" }),
  ];

  const reviews = reviewBatchLines(lines, existing);
  assert.equal(reviews[0].classification, "state_update");
  assert.equal(reviews[1].classification, "state_unchanged");
  assert.equal(reviews[2].classification, "state_new");
});

test("a topic changed twice in the same batch is compared against what the batch itself just set, not stale pre-batch state", () => {
  const existing = [knowledgeItem({ id: 8, type: "state", topic: "HOH", content: "Yash" })];
  const lines = [
    planLine({ line_number: 1, type: "state", topic: "HOH", content: "Angela" }),
    planLine({ line_number: 2, type: "state", topic: "HOH", content: "Angela" }),
  ];

  const reviews = reviewBatchLines(lines, existing);
  assert.equal(reviews[0].classification, "state_update");
  assert.equal(reviews[0].previousValue, "Yash");
  assert.equal(reviews[1].classification, "state_unchanged");
  assert.equal(reviews[1].previousValue, "Angela");
});

test("a mixed FACT/RULE/STATE batch classifies every line independently", () => {
  const existing = [
    knowledgeItem({ id: 8, type: "state", topic: "HOH", content: "Yash" }),
    knowledgeItem({ id: 14, type: "fact", content: "Devens used the Diamond Power of Veto during the veto ceremony." }),
  ];
  const lines = [
    planLine({ line_number: 1, type: "fact", content: "Yash has won several competitions this season." }),
    planLine({ line_number: 2, type: "rule", content: "Never invent live-feed information." }),
    planLine({ line_number: 3, type: "state", topic: "HOH", content: "Angela" }),
    planLine({ line_number: 4, type: "fact", content: "Devens used the Diamond Power of Veto during the veto ceremony." }),
  ];

  const reviews = reviewBatchLines(lines, existing);
  assert.equal(reviews[0].classification, "new");
  assert.equal(reviews[1].classification, "new");
  assert.equal(reviews[2].classification, "state_update");
  assert.equal(reviews[3].classification, "duplicate");
});

test("a duplicate detected against an earlier line in the same batch (not existing Knowledge) points at that line", () => {
  const lines = [
    planLine({ line_number: 1, type: "fact", content: "Yash has won several competitions this season." }),
    planLine({ line_number: 2, type: "fact", content: "Yash has won several competitions this season." }),
  ];

  const reviews = reviewBatchLines(lines, []);
  assert.equal(reviews[0].classification, "new");
  assert.equal(reviews[1].classification, "duplicate");
  assert.equal(reviews[1].matchedLineNumber, 1);
  assert.equal(reviews[1].matchedItemId, undefined);
});

// ---- summarizeBatchReview ----------------------------------------------------

test("summarizeBatchReview produces the dynamic counts shown in the review summary bar", () => {
  const reviews = [
    { classification: "new" as const },
    { classification: "new" as const },
    { classification: "state_new" as const },
    { classification: "duplicate" as const },
    { classification: "possible_duplicate" as const },
    { classification: "possible_duplicate" as const },
    { classification: "possible_overlap" as const },
    { classification: "state_update" as const },
    { classification: "state_update" as const },
    { classification: "state_unchanged" as const },
    { classification: "contradiction" as const },
  ];

  const summary = summarizeBatchReview(reviews);
  assert.deepEqual(summary, {
    total: 11,
    new: 3,
    possibleDuplicates: 3,
    possibleOverlaps: 1,
    stateUpdates: 2,
    stateUnchanged: 1,
    contradictions: 1,
  });
});

// ---- defaultSelectedLines -----------------------------------------------------

test("defaultSelectedLines pre-selects only new and state-change lines, leaving duplicates/overlaps/contradictions unchecked", () => {
  const reviews = [
    { line_number: 1, classification: "new" as const },
    { line_number: 2, classification: "duplicate" as const },
    { line_number: 3, classification: "possible_duplicate" as const },
    { line_number: 4, classification: "possible_overlap" as const },
    { line_number: 5, classification: "contradiction" as const },
    { line_number: 6, classification: "state_new" as const },
    { line_number: 7, classification: "state_update" as const },
    { line_number: 8, classification: "state_unchanged" as const },
  ];

  assert.deepEqual(defaultSelectedLines(reviews), [1, 6, 7]);
});
