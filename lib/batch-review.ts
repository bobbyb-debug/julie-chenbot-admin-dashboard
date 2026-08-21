import type { KnowledgeItem, KnowledgeType, PlanLine } from "./julie-types.ts";
import { classifyTextSimilarity, isLikelyContradiction } from "./knowledge-similarity.ts";
import { isDedicatedStateTopic } from "./official-state.ts";

/**
 * Classifies every valid line of a batch/state plan against existing
 * Knowledge (and against earlier lines in the same batch), so the
 * Teach Julie review screen can show what's genuinely new versus a
 * duplicate, an overlap, a contradiction, or a state change -- before
 * anything is written (see app/dashboard/knowledge/teach/TeachWorkspace.tsx).
 *
 * This runs entirely in the dashboard: the bot repo's own batch plan
 * endpoint (production/batch_teach.py) already reports STATE
 * conflicts against the live KnowledgeStore, and GET /api/v1/knowledge
 * already returns every item needed to compare FACT/RULE text against
 * -- no new bot-side endpoint or data is required, so the production
 * bot is not touched for this feature.
 */

export type BatchLineClassification =
  | "new"
  | "duplicate"
  | "possible_duplicate"
  | "possible_overlap"
  | "contradiction"
  | "state_new"
  | "state_update"
  | "state_unchanged";

export interface BatchLineReview {
  line_number: number;
  classification: BatchLineClassification;
  /** The existing Knowledge item this line was compared against, when
   * applicable (duplicate/possible_duplicate/possible_overlap/contradiction). */
  matchedItemId?: number;
  /** An earlier line in this same batch, when that's what matched
   * instead of (or in addition to) an existing Knowledge item. */
  matchedLineNumber?: number;
  matchedContent?: string;
  /** Jaccard similarity score behind a duplicate/overlap/contradiction call, in [0, 1]. */
  score?: number;
  /** STATE lines only: the topic's current active value, or null if the topic has never been taught. */
  previousValue?: string | null;
  /** STATE lines only: true when the topic has a dedicated Official
   * Game State field (HOH, NOMINEES, VETO_WINNER, VETO_USED,
   * HAVE_NOTS -- see lib/official-state.ts). Writing this line here
   * in Batch Teaching has the exact same effect on Official Game
   * State as writing it in Update State (both go through the same
   * KnowledgeStore.teach() auto-supersede-by-topic mechanism); this
   * only flags the line so the review UI can point out that Update
   * State is the more direct workflow for it, never that the line
   * "won't count" if applied here. */
  isDedicatedField?: boolean;
}

export interface BatchReviewSummary {
  total: number;
  new: number;
  possibleDuplicates: number;
  possibleOverlaps: number;
  stateUpdates: number;
  stateUnchanged: number;
  contradictions: number;
}

const COMPARABLE_TEXT_TYPES: readonly KnowledgeType[] = ["fact", "rule", "correction"];

interface TextCandidate {
  content: string;
  itemId?: number;
  lineNumber?: number;
}

type ReviewableLine = Pick<PlanLine, "line_number" | "type" | "content" | "topic">;
type ReviewableKnowledgeItem = Pick<KnowledgeItem, "id" | "type" | "content" | "topic" | "active">;

export function reviewBatchLines(
  lines: ReviewableLine[],
  existingKnowledge: ReviewableKnowledgeItem[],
): BatchLineReview[] {
  const existingTextCandidates: TextCandidate[] = existingKnowledge
    .filter((item) => item.active && COMPARABLE_TEXT_TYPES.includes(item.type))
    .map((item) => ({ content: item.content, itemId: item.id }));

  // Seeded from the store, then advanced per STATE line below -- this
  // mirrors build_plan()'s own "compare against what the moderator
  // just typed earlier in this batch, not stale pre-batch state" rule
  // (production/batch_teach.py, JulieChenBot repo) so a batch that
  // sets the same topic twice classifies correctly against itself.
  const activeStateByTopic = new Map<string, string>();
  for (const item of existingKnowledge) {
    if (item.active && item.type === "state" && item.topic) {
      activeStateByTopic.set(item.topic, item.content);
    }
  }

  const batchTextCandidates: TextCandidate[] = [];
  const reviews: BatchLineReview[] = [];

  for (const line of lines) {
    if (line.type === "state" && line.topic) {
      const previousValue = activeStateByTopic.get(line.topic) ?? null;
      const isDedicatedField = isDedicatedStateTopic(line.topic);

      if (previousValue === null) {
        reviews.push({ line_number: line.line_number, classification: "state_new", previousValue: null, isDedicatedField });
      } else if (previousValue === line.content) {
        reviews.push({ line_number: line.line_number, classification: "state_unchanged", previousValue, isDedicatedField });
      } else {
        reviews.push({ line_number: line.line_number, classification: "state_update", previousValue, isDedicatedField });
      }

      activeStateByTopic.set(line.topic, line.content);
      continue;
    }

    let best: { candidate: TextCandidate; relation: "duplicate" | "near_duplicate" | "overlap"; score: number } | null = null;
    let bestContradiction: { candidate: TextCandidate; score: number } | null = null;

    for (const candidate of [...existingTextCandidates, ...batchTextCandidates]) {
      const { relation, score } = classifyTextSimilarity(candidate.content, line.content);
      if (relation === "none") continue;
      if (!best || score > best.score) best = { candidate, relation, score };

      // A contradiction signal wins even against a candidate with a
      // lower raw similarity score than the top match: two sentences
      // that share generic connector words ("did", "not") without
      // being about the same disagreement can outscore the one
      // candidate that actually contradicts this line, and a missed
      // contradiction is a far worse outcome than a merely-imprecise
      // "possible overlap" match -- see the "did not win the regular
      // Power of Veto" vs. two different existing sentences case this
      // is regression-tested against below.
      if (isLikelyContradiction(candidate.content, line.content, score)) {
        if (!bestContradiction || score > bestContradiction.score) {
          bestContradiction = { candidate, score };
        }
      }
    }

    if (bestContradiction) {
      reviews.push({
        line_number: line.line_number,
        classification: "contradiction",
        matchedItemId: bestContradiction.candidate.itemId,
        matchedLineNumber: bestContradiction.candidate.lineNumber,
        matchedContent: bestContradiction.candidate.content,
        score: bestContradiction.score,
      });
    } else if (!best) {
      reviews.push({ line_number: line.line_number, classification: "new" });
    } else {
      const classification: BatchLineClassification =
        best.relation === "duplicate"
          ? "duplicate"
          : best.relation === "near_duplicate"
            ? "possible_duplicate"
            : "possible_overlap";

      reviews.push({
        line_number: line.line_number,
        classification,
        matchedItemId: best.candidate.itemId,
        matchedLineNumber: best.candidate.lineNumber,
        matchedContent: best.candidate.content,
        score: best.score,
      });
    }

    batchTextCandidates.push({ content: line.content, lineNumber: line.line_number });
  }

  return reviews;
}

export function summarizeBatchReview(reviews: Pick<BatchLineReview, "classification">[]): BatchReviewSummary {
  const summary: BatchReviewSummary = {
    total: reviews.length,
    new: 0,
    possibleDuplicates: 0,
    possibleOverlaps: 0,
    stateUpdates: 0,
    stateUnchanged: 0,
    contradictions: 0,
  };

  for (const review of reviews) {
    switch (review.classification) {
      case "new":
      case "state_new":
        summary.new++;
        break;
      case "duplicate":
      case "possible_duplicate":
        summary.possibleDuplicates++;
        break;
      case "possible_overlap":
        summary.possibleOverlaps++;
        break;
      case "state_update":
        summary.stateUpdates++;
        break;
      case "state_unchanged":
        summary.stateUnchanged++;
        break;
      case "contradiction":
        summary.contradictions++;
        break;
    }
  }

  return summary;
}

/** Line numbers that should start pre-checked in the review UI:
 * genuinely new knowledge and state changes. Everything else
 * (duplicate/possible_duplicate/possible_overlap/contradiction/
 * state_unchanged) is surfaced but left unchecked -- applying it
 * requires an explicit, informed choice, never a side effect of
 * clicking "Apply" on a batch that also contained new lines. */
export function defaultSelectedLines(
  reviews: Pick<BatchLineReview, "line_number" | "classification">[],
): number[] {
  return reviews
    .filter(
      (r) =>
        r.classification === "new" ||
        r.classification === "state_new" ||
        r.classification === "state_update",
    )
    .map((r) => r.line_number);
}
