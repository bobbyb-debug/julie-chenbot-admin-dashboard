import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalize,
  classifyTextSimilarity,
  contentTokens,
  hasNegation,
  isLikelyContradiction,
  jaccardSimilarity,
  normalizeWords,
} from "../lib/knowledge-similarity.ts";

test("normalizeWords lowercases, strips punctuation, and splits on whitespace", () => {
  assert.deepEqual(normalizeWords("Devens used the Diamond Power of Veto."), [
    "devens", "used", "the", "diamond", "power", "of", "veto",
  ]);
});

test("canonicalize ignores word order and stopwords -- a reworded (passive-voice) sentence matches", () => {
  const active = "Devens used the Diamond Power of Veto to remove Dee from the block.";
  const passive = "The Diamond Power of Veto was used by Devens to remove Dee from the block.";
  assert.equal(canonicalize(active), canonicalize(passive));
});

test("canonicalize distinguishes sentences with genuinely different content words", () => {
  assert.notEqual(
    canonicalize("Yash won the regular Power of Veto."),
    canonicalize("Yash won the Golden Power of Veto."),
  );
});

test("jaccardSimilarity of identical token sets is 1", () => {
  const tokens = contentTokens("Yash is the current HOH");
  assert.equal(jaccardSimilarity(tokens, tokens), 1);
});

test("jaccardSimilarity of disjoint token sets is 0", () => {
  assert.equal(
    jaccardSimilarity(contentTokens("Yash won the veto"), contentTokens("Angela was nominated")),
    0,
  );
});

test("hasNegation detects whole-word negation markers", () => {
  assert.equal(hasNegation("Yash did not use the veto."), true);
  assert.equal(hasNegation("Dee did not use her bribe power."), true);
  assert.equal(hasNegation("Yash used the veto."), false);
});

test("hasNegation does not false-positive on words that merely contain a negation substring", () => {
  // "nomination" contains "no", "notice" contains "not" -- neither is the word "no"/"not".
  assert.equal(hasNegation("The nomination notice was posted."), false);
});

// ---- classifyTextSimilarity -------------------------------------------------

test("exact duplicate text (modulo case/punctuation) classifies as 'duplicate' with score 1", () => {
  const result = classifyTextSimilarity(
    "Devens used the Diamond Power of Veto to remove Dee from the block.",
    "devens used the diamond power of veto to remove dee from the block",
  );
  assert.equal(result.relation, "duplicate");
  assert.equal(result.score, 1);
});

test("a reworded (passive-voice) restatement of the same fact classifies as 'duplicate' via canonicalization", () => {
  // This is the "near-duplicate" example from the product spec: same
  // fact, different grammar. canonicalize() strips word order and
  // stopwords, so this lands as an exact canonical match.
  const result = classifyTextSimilarity(
    "Devens used the Diamond Power of Veto to remove Dee from the block.",
    "The Diamond Power of Veto was used by Devens to remove Dee from the block.",
  );
  assert.equal(result.relation, "duplicate");
});

test("two sentences sharing a topic but with materially different content classify as 'overlap', not 'duplicate'", () => {
  // The "possible overlap" example from the product spec: related,
  // partially-overlapping wording, but not a restatement of the same
  // sentence.
  const result = classifyTextSimilarity(
    "Kamu was named as the replacement nominee after Devens used the Diamond Power of Veto.",
    "Kamu became the replacement nominee as a result of the Diamond Power of Veto ceremony.",
  );
  assert.equal(result.relation, "overlap");
  assert.ok(result.score >= 0.4 && result.score < 0.7, `score ${result.score} should be in the overlap band`);
});

test("unrelated sentences classify as 'none'", () => {
  const result = classifyTextSimilarity(
    "Yash is the current Head of Household.",
    "The Mosh Pit alliance includes Mallory, Melody, and Drew.",
  );
  assert.equal(result.relation, "none");
});

test("a genuinely new fact about a shared subject but distinct content is not forced into duplicate/overlap", () => {
  const result = classifyTextSimilarity(
    "Yash has the best Competition Status record.",
    "The house nominated three people this week.",
  );
  assert.equal(result.relation, "none");
});

// ---- isLikelyContradiction --------------------------------------------------

test("negated vs. non-negated restatement of the same claim is flagged as a likely contradiction", () => {
  const existing = "Yash did use the Power of Veto.";
  const proposed = "Yash did not use the Power of Veto.";
  const { score } = classifyTextSimilarity(existing, proposed);
  assert.equal(isLikelyContradiction(existing, proposed, score), true);
});

test("two sentences with matching negation are not flagged as contradictions", () => {
  const existing = "Yash did not use the Power of Veto.";
  const proposed = "Yash did not use the Golden Power of Veto.";
  const { score } = classifyTextSimilarity(existing, proposed);
  assert.equal(isLikelyContradiction(existing, proposed, score), false);
});

test("isLikelyContradiction never fires below the overlap threshold, even with mismatched negation", () => {
  assert.equal(isLikelyContradiction("Yash won the veto.", "Nobody has ever left this house.", 0.1), false);
});
