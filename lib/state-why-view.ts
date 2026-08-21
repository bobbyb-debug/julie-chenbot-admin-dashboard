import type { KnowledgeItem, StateWhyResponse } from "./julie-types";

/**
 * Resolves what the Why page shows for one topic, from the bot's
 * /api/v1/state/{topic}/why response (see docs/API.md and
 * admin_api/routes.py state_why() in the JulieChenBot repo).
 *
 * The two fields this reads are already independent by construction
 * on the bot side: current_state comes from KnowledgeStore.active_state()
 * (explicitly taught, moderator-confirmed) and house_status_value comes
 * from the automated RSS/live-feed HouseStatus snapshot -- neither is
 * ever derived from the other. This function's only job is to decide
 * *display* behavior (what counts as "not taught", when the live feed
 * is worth showing, when it's worth flagging as differing) without
 * ever treating one stream as a stand-in for the other.
 */
export interface StateWhyView {
  /** The explicitly-taught current value, or null if nothing has ever
   * been taught for this topic (or every taught record has since been
   * deactivated with nothing replacing it). Never derived from the
   * live feed. */
  currentTaughtValue: string | null;
  /** The live feed's current observation, or null when there's
   * nothing to show -- either the topic has no live-feed equivalent
   * (e.g. LAST_HOUSEGUEST_EVICTED) or the feed hasn't observed
   * anything for it yet. */
  liveFeedValue: string | null;
  /** Whether to render a live-feed comparison section at all. */
  showLiveFeed: boolean;
  /** Whether the live feed's value differs from the taught value --
   * only meaningful (and only ever true) when both exist. A taught
   * value with no live-feed observation, or a live-feed observation
   * with nothing taught yet, is not a "conflict" to warn about here;
   * it's simply the other stream having nothing to compare. */
  differs: boolean;
}

export function buildStateWhyView(
  data: Pick<StateWhyResponse, "current_state" | "house_status_value">,
): StateWhyView {
  const currentTaughtValue = data.current_state?.content ?? null;

  const trimmedLiveFeed = (data.house_status_value ?? "").trim();
  const liveFeedValue = trimmedLiveFeed.length > 0 ? trimmedLiveFeed : null;

  const differs =
    liveFeedValue != null &&
    currentTaughtValue != null &&
    currentTaughtValue.trim().toLowerCase() !== liveFeedValue.toLowerCase();

  return {
    currentTaughtValue,
    liveFeedValue,
    showLiveFeed: liveFeedValue != null,
    differs,
  };
}

/** Whether a STATE knowledge item in a topic's taught history (see
 * StateWhyResponse.history) is the current taught value, for
 * highlighting it distinctly from superseded/deactivated ones.
 *
 * Deliberately reads `active` rather than "is this the last item in
 * the array": history is sorted oldest-created-first, which is NOT
 * the same thing whenever an admin reactivates an older record
 * instead of teaching a new one (KnowledgeStore.reactivate() flips
 * `active` back to true in place -- it does not change `created_at`,
 * so a reactivated older record would still sort earlier than a
 * newer, now-deactivated one and be missed by a position check). */
export function isCurrentTaughtRecord(item: Pick<KnowledgeItem, "active">): boolean {
  return item.active;
}
