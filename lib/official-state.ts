import type { GameStateResponse, OfficialStateItem } from "./julie-types";

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
