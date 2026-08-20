import type { KnowledgeItem } from "./julie-types";

export interface KnowledgeActionVisibility {
  showCorrect: boolean;
  showDeactivate: boolean;
  showReactivate: boolean;
}

/** Single source of truth for which lifecycle actions a knowledge
 * item should show, in both the Knowledge list and its detail page --
 * so the two views (and any future one) can never drift apart.
 *
 * Lifecycle:
 *   ACTIVE       -> Correct (non-STATE only) + Deactivate
 *   DEACTIVATED  -> Reactivate only
 *
 * There is deliberately no separate "correct a deactivated item"
 * action: reactivating an item flips `active` back to true, and this
 * same function then returns Correct + Deactivate for it automatically
 * on the next read -- Deactivated -> Reactivate -> Active -> Correct
 * is one lifecycle driven entirely by `item.active`, not two
 * independent rulesets to keep in sync.
 *
 * STATE items never show Correct (active or not): they have their own
 * dedicated Update State workflow (see the Game State page), which is
 * what actually changes what /hoh, /nominees, /veto report -- a
 * generic text Correction on a STATE item would silently do nothing
 * for those commands, which is exactly the kind of collapsed-concept
 * confusion the official-facts architecture must not allow.
 */
export function visibleKnowledgeActions(
  item: Pick<KnowledgeItem, "active" | "type">,
  canModerate: boolean,
): KnowledgeActionVisibility {
  if (!canModerate) {
    return { showCorrect: false, showDeactivate: false, showReactivate: false };
  }

  if (!item.active) {
    return { showCorrect: false, showDeactivate: false, showReactivate: true };
  }

  return {
    showCorrect: item.type !== "state",
    showDeactivate: true,
    showReactivate: false,
  };
}
