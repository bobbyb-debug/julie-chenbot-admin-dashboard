/**
 * Deterministic text-similarity helpers backing the Batch Teaching
 * review flow (see lib/batch-review.ts). Pure string comparison, no
 * network calls and no AI/embedding dependency -- the same
 * "deterministic, understandable, and safe" posture the bot repo's
 * own batch_teach.py already uses for its STATE conflict detection
 * (see production/batch_teach.py, JulieChenBot repo), extended here
 * to FACT/RULE text so paraphrased duplicates can be caught too.
 */

const STOPWORDS = new Set([
  "a", "an", "the",
  "is", "was", "were", "are", "be", "been", "being",
  "to", "of", "in", "on", "at", "by", "for", "with", "as",
  "and", "or", "that", "this", "it", "its",
  "from", "into", "over", "after", "before",
  "her", "his", "their", "she", "he", "they", "them",
]);

// Whole-word negation markers. Deliberately small and literal --
// this is a signal for "flag for human review", not a grammar
// parser, so false negatives (missing an unusual negation) are far
// safer than false positives (misreading a word that merely contains
// "no" as a substring).
const NEGATION_WORDS = new Set([
  "not", "no", "never", "none", "without",
  "didnt", "doesnt", "wont", "cant", "cannot",
  "isnt", "wasnt", "werent", "arent", "hasnt", "havent", "hadnt",
]);

/** Lowercases, strips punctuation/apostrophes, and splits on
 * whitespace. Punctuation is dropped rather than treated as a token
 * boundary substitute so "Veto." and "Veto" compare equal. */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Content words only (stopwords removed) as a Set, for Jaccard
 * comparison -- order and repetition don't matter for "do these two
 * sentences talk about the same thing," which is all this measures. */
export function contentTokens(text: string): Set<string> {
  return new Set(normalizeWords(text).filter((w) => !STOPWORDS.has(w)));
}

/** A canonical form for exact-duplicate detection: content words,
 * deduplicated and sorted, so word order and reworded stopwords/
 * connectors ("X was used by Y" vs "Y used X") no longer matter but
 * the actual content words still must match exactly. */
export function canonicalize(text: string): string {
  return Array.from(contentTokens(text)).sort().join(" ");
}

/** True if `text` contains a whole-word negation marker. */
export function hasNegation(text: string): boolean {
  return normalizeWords(text).some((w) => NEGATION_WORDS.has(w));
}

/** Jaccard index of two token sets: |intersection| / |union|, in
 * [0, 1]. Two empty sets are trivially identical (1); one empty and
 * one non-empty share nothing (0). */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const NEAR_DUPLICATE_THRESHOLD = 0.7;
export const OVERLAP_THRESHOLD = 0.4;

export type TextRelation = "duplicate" | "near_duplicate" | "overlap" | "none";

/** Classifies how similar `proposed` is to `existing`, independent of
 * any contradiction check (see classifyContradiction below, applied
 * separately in lib/batch-review.ts). */
export function classifyTextSimilarity(existing: string, proposed: string): {
  relation: TextRelation;
  score: number;
} {
  if (canonicalize(existing) === canonicalize(proposed)) {
    return { relation: "duplicate", score: 1 };
  }

  const score = jaccardSimilarity(contentTokens(existing), contentTokens(proposed));
  if (score >= NEAR_DUPLICATE_THRESHOLD) return { relation: "near_duplicate", score };
  if (score >= OVERLAP_THRESHOLD) return { relation: "overlap", score };
  return { relation: "none", score };
}

/** A contradiction candidate is two texts that talk about the same
 * thing (meaningful word overlap) but disagree on polarity -- one
 * negates, the other doesn't. This intentionally only fires above
 * OVERLAP_THRESHOLD: unrelated sentences that happen to both/neither
 * contain "not" are not a contradiction. */
export function isLikelyContradiction(existing: string, proposed: string, score: number): boolean {
  if (score < OVERLAP_THRESHOLD) return false;
  return hasNegation(existing) !== hasNegation(proposed);
}
