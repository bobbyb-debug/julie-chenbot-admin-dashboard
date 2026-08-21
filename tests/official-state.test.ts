import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEDICATED_STATE_TOPICS,
  activeStateRole,
  isDedicatedStateTopic,
  officialGameFacts,
  otherCurrentStateTopics,
  parseVetoUsed,
} from "../lib/official-state.ts";
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

// ==========================================================
// Dedicated vs. generic current-state topics -- prevents a topic
// like HAVE_NOTS from being rendered a second time in "Other Current
// State" as if it were a separate, competing current value.
// ==========================================================

test("every dedicated field topic is recognized", () => {
  for (const topic of DEDICATED_STATE_TOPICS) {
    assert.equal(isDedicatedStateTopic(topic), true);
  }
});

test("isDedicatedStateTopic is case- and whitespace-insensitive", () => {
  assert.equal(isDedicatedStateTopic("hoh"), true);
  assert.equal(isDedicatedStateTopic(" Have_Nots "), true);
});

test("an admin-taught topic with no dedicated field is not recognized as dedicated", () => {
  assert.equal(isDedicatedStateTopic("LAST_HOUSEGUEST_EVICTED"), false);
});

test("otherCurrentStateTopics excludes every dedicated field, including VETO_USED", () => {
  const gameState: Pick<GameStateResponse, "official_state"> = {
    official_state: {
      HOH: officialItem("Yash", "HOH"),
      NOMINEES: officialItem("Angela, Haley", "NOMINEES"),
      VETO_WINNER: officialItem("Yash", "VETO_WINNER"),
      VETO_USED: officialItem("no", "VETO_USED"),
      HAVE_NOTS: officialItem("LaLa, Taylor, Mallory", "HAVE_NOTS"),
      LAST_HOUSEGUEST_EVICTED: officialItem("Kamu", "LAST_HOUSEGUEST_EVICTED"),
    },
  };

  const other = otherCurrentStateTopics(gameState);
  assert.equal(other.length, 1);
  assert.equal(other[0].topic, "LAST_HOUSEGUEST_EVICTED");
});

test("HAVE_NOTS never appears in otherCurrentStateTopics when it's an active dedicated field -- regression for the 'shown twice' bug", () => {
  const gameState: Pick<GameStateResponse, "official_state"> = {
    official_state: { HAVE_NOTS: officialItem("LaLa, Taylor, Mallory", "HAVE_NOTS") },
  };

  assert.deepEqual(otherCurrentStateTopics(gameState), []);
});

test("otherCurrentStateTopics handles an empty/missing official_state", () => {
  assert.deepEqual(otherCurrentStateTopics({ official_state: {} }), []);
  assert.deepEqual(otherCurrentStateTopics({} as Pick<GameStateResponse, "official_state">), []);
});

// ==========================================================
// activeStateRole() -- ties an active STATE Knowledge list row back
// to what Current Game State already shows, instead of letting it
// read as a second, competing fact.
// ==========================================================

test("activeStateRole labels an active dedicated-field STATE item 'official'", () => {
  assert.equal(activeStateRole({ type: "state", active: true, topic: "HOH" }), "official");
});

test("activeStateRole labels an active generic STATE item 'current'", () => {
  assert.equal(activeStateRole({ type: "state", active: true, topic: "LAST_HOUSEGUEST_EVICTED" }), "current");
});

test("activeStateRole returns null for a deactivated STATE item -- history is not current truth", () => {
  assert.equal(activeStateRole({ type: "state", active: false, topic: "HOH" }), null);
});

test("activeStateRole returns null for non-STATE knowledge (fact/rule/correction)", () => {
  assert.equal(activeStateRole({ type: "fact", active: true, topic: null }), null);
  assert.equal(activeStateRole({ type: "rule", active: true, topic: null }), null);
  assert.equal(activeStateRole({ type: "correction", active: true, topic: null }), null);
});

test("activeStateRole returns null for a STATE item with no topic (should not happen, but must not crash or mislabel)", () => {
  assert.equal(activeStateRole({ type: "state", active: true, topic: null }), null);
});
