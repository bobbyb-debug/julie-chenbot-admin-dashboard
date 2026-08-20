import { test } from "node:test";
import assert from "node:assert/strict";
import { officialGameFacts, parseVetoUsed } from "../lib/official-state.ts";
import type { GameStateResponse, HouseStatusSnapshot, OfficialStateItem } from "../lib/julie-types.ts";

// Regression coverage for the Overview page bug: "Current Game" was
// reading gameState.house_status (automated, unverified live-feed
// observation) instead of gameState.official_state (dashboard-
// confirmed, authoritative). officialGameFacts() is the single
// resolution point both the Overview and Game State pages now use --
// these tests prove it never reads house_status at all, and never
// falls back to it when a topic is unset.

function officialItem(content: string, topic: string): OfficialStateItem {
  return {
    id: 1,
    type: "state",
    content,
    author_id: 1,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    active: true,
    supersedes: null,
    topic,
    note: null,
  };
}

function liveFeedObservation(overrides: Partial<HouseStatusSnapshot> = {}): HouseStatusSnapshot {
  return {
    timestamp: "2026-08-01T00:00:00Z",
    hoh: "",
    nominees: [],
    veto_holder: "",
    veto_used: false,
    have_nots: [],
    feeds: "up",
    ...overrides,
  };
}

test("official HOH is used even when the live feed disagrees", () => {
  const gameState: Pick<GameStateResponse, "official_state" | "house_status"> = {
    official_state: { HOH: officialItem("Yash", "HOH") },
    house_status: liveFeedObservation({ hoh: "Taylor" }),
  };

  const facts = officialGameFacts(gameState);

  assert.equal(facts.hoh?.content, "Yash");
});

test("official nominees are used even when the live feed lists different names", () => {
  const gameState: Pick<GameStateResponse, "official_state" | "house_status"> = {
    official_state: { NOMINEES: officialItem("Angela, Haley, Kamu", "NOMINEES") },
    house_status: liveFeedObservation({ nominees: ["Someone", "Else"] }),
  };

  const facts = officialGameFacts(gameState);

  assert.equal(facts.nominees?.content, "Angela, Haley, Kamu");
});

test("official veto winner is used even when the live feed reports someone else", () => {
  const gameState: Pick<GameStateResponse, "official_state" | "house_status"> = {
    official_state: { VETO_WINNER: officialItem("Yash", "VETO_WINNER") },
    house_status: liveFeedObservation({ veto_holder: "Barrett" }),
  };

  const facts = officialGameFacts(gameState);

  assert.equal(facts.vetoWinner?.content, "Yash");
});

test("a missing official topic resolves to undefined -- never falls back to the live feed", () => {
  const gameState: Pick<GameStateResponse, "official_state" | "house_status"> = {
    official_state: {}, // nothing taught yet
    house_status: liveFeedObservation({ hoh: "Taylor", veto_holder: "Barrett" }),
  };

  const facts = officialGameFacts(gameState);

  assert.equal(facts.hoh, undefined);
  assert.equal(facts.nominees, undefined);
  assert.equal(facts.vetoWinner, undefined);
  assert.equal(facts.haveNots, undefined);
});

test("official_state entirely absent (older API response) still resolves to undefined, not a crash", () => {
  const gameState = { house_status: liveFeedObservation({ hoh: "Taylor" }) } as Pick<
    GameStateResponse,
    "official_state" | "house_status"
  >;

  const facts = officialGameFacts(gameState);

  assert.equal(facts.hoh, undefined);
});

test("have-nots resolve from official_state only", () => {
  const gameState: Pick<GameStateResponse, "official_state" | "house_status"> = {
    official_state: { HAVE_NOTS: officialItem("Dee, Angela", "HAVE_NOTS") },
    house_status: liveFeedObservation({ have_nots: ["Someone"] }),
  };

  const facts = officialGameFacts(gameState);

  assert.equal(facts.haveNots?.content, "Dee, Angela");
});

// ==========================================================
// parseVetoUsed() -- controls the veto hint on both pages
// ==========================================================

test("parseVetoUsed recognizes yes/true/used as true", () => {
  assert.equal(parseVetoUsed("yes"), true);
  assert.equal(parseVetoUsed("Yes"), true);
  assert.equal(parseVetoUsed("true"), true);
  assert.equal(parseVetoUsed("used"), true);
});

test("parseVetoUsed recognizes no/false as false", () => {
  assert.equal(parseVetoUsed("no"), false);
  assert.equal(parseVetoUsed("No"), false);
  assert.equal(parseVetoUsed("false"), false);
});

test("parseVetoUsed returns undefined when VETO_USED was never taught", () => {
  assert.equal(parseVetoUsed(undefined), undefined);
  assert.equal(parseVetoUsed(""), undefined);
});

test("parseVetoUsed returns undefined for unrecognized free text, never guesses", () => {
  assert.equal(parseVetoUsed("during the Diamond POV ceremony"), undefined);
});
