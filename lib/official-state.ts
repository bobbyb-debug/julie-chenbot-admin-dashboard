import type { GameStateResponse, KnowledgeItem, OfficialStateItem } from "./julie-types";

/** The handful of official-facts topics every game-state display
 * reads, resolved once from gameState.official_state -- the
 * dashboard-confirmed source of truth (see docs/API.md). Deliberately
 * does not read gameState.house_status anywhere: that's the
 * automated, unverified live-feed observation, and an unset official
 * topic must stay visibly unset rather than silently fall back to it. */
export interface OfficialGameFacts {
  hoh?: OfficialStateItem;
  nominees?: OfficialStateItem;
  vetoWinner?: OfficialStateItem;
  haveNots?: OfficialStateItem;
  vetoUsed?: OfficialStateItem;
}

/** Every topic with a dedicated, structured field in OfficialGameFacts
 * above (and therefore its own card/Field on Game State, Overview, and
 * the Knowledge Center's Current Game State panel). Centralized here,
 * not duplicated per page, so a topic can never be treated as
 * "dedicated" on one page and "generic" on another -- that drift is
 * exactly what made HAVE_NOTS able to show up as if it were a second,
 * competing current value instead of the one already on display. */
export const DEDICATED_STATE_TOPICS = ["HOH", "NOMINEES", "VETO_WINNER", "VETO_USED", "HAVE_NOTS"] as const;

export function isDedicatedStateTopic(topic: string): boolean {
  return (DEDICATED_STATE_TOPICS as readonly string[]).includes(topic.trim().toUpperCase());
}

/** Single resolution point for the topics above -- shared by the Game
 * State page (the original reference implementation) and the
 * Overview page's "Current Game" cards, so neither can drift on which
 * topic keys they read or which store they read them from. */
export function officialGameFacts(
  gameState: Pick<GameStateResponse, "official_state">,
): OfficialGameFacts {
  const official = gameState.official_state ?? {};

  return {
    hoh: official["HOH"],
    nominees: official["NOMINEES"],
    vetoWinner: official["VETO_WINNER"],
    haveNots: official["HAVE_NOTS"],
    vetoUsed: official["VETO_USED"],
  };
}

/** Every active official-facts STATE topic that does NOT have a
 * dedicated field above -- e.g. an admin-taught LAST_HOUSEGUEST_EVICTED.
 * This is the single source of truth for "Other Current State"
 * wherever it's shown (Game State page, Knowledge Center's Current
 * Game State panel), so a dedicated topic like HAVE_NOTS can never
 * be rendered a second time here as if it were a separate, competing
 * current value. */
export function otherCurrentStateTopics(
  gameState: Pick<GameStateResponse, "official_state">,
): OfficialStateItem[] {
  return Object.values(gameState.official_state ?? {}).filter(
    (item) => !isDedicatedStateTopic(item.topic),
  );
}

/** Parses an official VETO_USED topic's free-text content ("yes"/
 * "no"/"true"/"false"/"used", taught the same generic way any other
 * STATE topic is -- see commands/veto.py in the bot repo) into a
 * plain boolean. Returns undefined when the content is missing or
 * doesn't match a recognized value -- callers decide their own
 * display wording ("Used" vs "Yes", or falling back to the raw
 * content), this only owns the parsing, so every page that reads
 * VETO_USED agrees on what counts as "used". */
export function parseVetoUsed(vetoUsedContent: string | undefined): boolean | undefined {
  if (!vetoUsedContent) return undefined;
  const normalized = vetoUsedContent.trim().toLowerCase();
  if (["yes", "true", "used"].includes(normalized)) return true;
  if (["no", "false"].includes(normalized)) return false;
  return undefined;
}

/** Whether an active STATE knowledge item is the current official
 * value for a dedicated field (e.g. HOH) versus a generic current
 * STATE topic with no dedicated field (e.g. LAST_HOUSEGUEST_EVICTED).
 * Returns null for anything that isn't an active STATE item -- facts,
 * rules, corrections, and deactivated/historical STATE records are
 * never "the current official value" of anything, and the Knowledge
 * list's existing Deactivated badge + strikethrough already marks
 * history as subordinate; this only labels the two kinds of *current*
 * STATE row so they visibly tie back to what Current Game State shows
 * above them, rather than reading as a separate, competing fact. */
export function activeStateRole(
  item: Pick<KnowledgeItem, "type" | "active" | "topic">,
): "official" | "current" | null {
  if (item.type !== "state" || !item.active || !item.topic) return null;
  return isDedicatedStateTopic(item.topic) ? "official" : "current";
}
