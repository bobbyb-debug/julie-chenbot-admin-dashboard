# Julie ChenBot Admin API — Contract

This documents the **actual, deployed** API this dashboard talks to — read directly from
`admin_api/routes.py` and `admin_api/auth.py` in the production
[JulieChenBot](https://github.com/bobbyb-debug/JulieChenBot) repo (`codex-engine-review` branch,
merge commit `e21fc16`), not inferred or guessed. If this file and the production code ever
disagree, the code is right — re-verify before trusting this document.

> **Pending architecture fix, not yet merged/deployed:** the `official_state` field on
> `GET /api/v1/game-state` and the corrected `house_status`/conflict semantics described below
> come from a JulieChenBot PR (`fix/official-facts-architecture`) that fixes automated live-feed
> parsing being able to silently overwrite manually-confirmed game facts. Until that PR is merged
> and deployed, the live API does not yet return `official_state`, and `/teach update`/
> `/api/v1/state/apply` still also mutate `house_status` directly. Re-verify against the deployed
> commit before trusting this doc's shape as currently live.

Base URL: `https://juliechenbot-production.up.railway.app` (configured here as `JULIE_API_URL`,
server-side only — see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Authentication

Every route except `GET /health` requires:
```
Authorization: Bearer <ADMIN_API_KEY>
```
Missing, malformed, or wrong → `401 {"error": "unauthorized"}`. There is no per-user auth on
Julie's side — one shared secret authenticates "this request came from the dashboard backend."
This dashboard's own login system (email/password, RBAC) is a separate, additional layer that
exists only in this repo — see `docs/ARCHITECTURE.md`.

## Public liveness

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | `200 {"status": "ok"}` |

Deliberately unauthenticated (for Railway's health check) and deliberately minimal — no engine
state, no secrets. Not used by this dashboard's own code (it calls the richer `/api/v1/health`
instead) but documented here since it's part of the real, live contract.

## Health / Game State / Conflicts

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/v1/health` | — | `{ engine: {...}, info: {...} }` — see `EngineHealth`/`EngineInfo` in `lib/julie-types.ts` |
| GET | `/api/v1/game-state` | — | `{ house_status: {...}, competition: {...}, official_state: {...} }` |
| GET | `/api/v1/conflicts` | — | `{ conflicts: [{ topic, house_status_value, taught_value, reason }] }` |

`house_status` fields: `hoh`, `nominees` (string array), `veto_holder`, `veto_used` (bool),
`have_nots` (string array), `feeds`, `timestamp`. **Automated, RSS-parser-driven, and never
authoritative** — it is not the source of truth for any Discord command or for this dashboard's
primary Game State display; it exists purely as a live, unverified observation for comparison
against `official_state`. **No `original_nominees`, `removed_nominee`, or `replacement_nominee`
fields exist** — see "Missing capabilities" below.

`official_state` is the actual source of truth: every active STATE knowledge item, keyed by
topic (e.g. `official_state.HOH`), each shaped like a `KnowledgeItem` (see Knowledge below). Set
only via `/teach update` on Discord or this dashboard's Update State — never by automated
live-feed parsing. This is what `/hoh`, `/nominees`, `/noms`, and `/veto` actually read.

`conflicts[].reason` explicitly states the live feed is not authoritative — a conflict entry is a
"the live feed may have new information worth manually confirming" signal, never a "two equal
sources disagree, pick one" prompt.

## Knowledge

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/knowledge` | query: `type`, `active`, `topic`, `q` | `KnowledgeItem[]` | `400` unknown type |
| GET | `/api/v1/knowledge/{id}` | — | `KnowledgeItem` | `400` bad id, `404` not found |
| POST | `/api/v1/knowledge` | `{ type, content, author_id, supersedes?, topic?, note? }` | `KnowledgeItem`, `201` | `400` validation |
| POST | `/api/v1/knowledge/{id}/forget` | — | `{ id, forgotten: bool }` | `400` bad id |
| GET | `/api/v1/state/{topic}/why` | — | `{ topic, current_state, house_status_value, history[], related_facts[] }` | — |

`KnowledgeItem`: `id`, `type` (`fact`\|`rule`\|`correction`\|`state`), `content`, `author_id`,
`created_at`, `updated_at`, `active` (bool), `supersedes` (id or null), `topic` (string or null,
STATE only), `note` (string or null).

`type` is a required, closed enum — the API rejects anything else with `400`. `topic` is required
for `state` and rejected for every other type (`400` from `KnowledgeStore.teach()`).

Deletion is always soft (`forget` sets `active: false`) — there is no hard-delete endpoint, by
design (see the production repo's own docs).

## Batch teaching / manual state updates

Both follow the same preview-then-apply shape used by `/teach batch` and `/teach update` on
Discord — nothing is written by the `plan` calls.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/batch/plan` | `{ text }` | `{ valid[], invalid[], conflicts[] }` |
| POST | `/api/v1/batch/apply` | `{ text, author_id, line_numbers? }` | `{ written: KnowledgeItem[] }` |
| POST | `/api/v1/state/plan` | `{ text, reason? }` | `{ valid[], invalid[], conflicts[] }` |
| POST | `/api/v1/state/apply` | `{ text, author_id, reason?, line_numbers? }` | `{ written[], applied_topics[] }` |

`text` uses the bot's own strict syntax — `FACT:`/`RULE:`/`STATE:` prefixes for batch,
`TOPIC: value` for state updates. `line_numbers`, when given, restricts which previewed lines
actually get written (the dashboard's select/deselect UI). `/api/v1/state/apply` writes only to
`official_state` (KnowledgeStore) — it never touches `house_status`. Topics with a directly
comparable `house_status` field for conflict-detection purposes: `HOH`, `NOMINEES`,
`VETO_WINNER`, `HAVE_NOTS` (these are what `applied_topics` reports); any other topic (e.g.
`EVICTED`, `VETO_USED`) is still recorded as an official fact the same way, it just has nothing
to be diffed against in `/api/v1/conflicts`.

## Sources / Events / Diagnostics / Discord

| Method | Path | Response |
|---|---|---|
| GET | `/api/v1/sources` | `{ rss, house_image, competition, hamsterwatch, monitors }` |
| GET | `/api/v1/events` | `RecentEventEntry[]` (query: `limit`, default 50, max 200) |
| GET | `/api/v1/events/pending` | `ProductionEvent[]` — queued, not yet delivered |
| GET | `/api/v1/diagnostics` | `{ health, watcher, pending_events[], recent_warnings[] }` |
| GET | `/api/v1/discord/routing` | `{ channels, routing }` — routing read live from the real router, never hand-duplicated |

`sources.hamsterwatch` is `null` if that monitor failed to initialize (see `watcher.failed_monitors`
in `/diagnostics`) — the dashboard renders this as a problem state, never as "healthy with no data."

Full type shapes: `lib/julie-types.ts` in this repo, kept in sync with the production response
shapes by hand (there's no shared schema package between the two repos).

## Missing capabilities (dashboard functionality that can't be fully built yet)

Documented rather than invented, per the "no fake data" rule:

- **No structured "original nominees" field.** `house_status.nominees` is always the *current*
  list. The Game State page works around this honestly by showing the taught STATE history for
  the `NOMINEES` topic (via `/api/v1/state/NOMINEES/why`) — which is often good enough to see an
  original nomination replaced by a veto, since moderators typically re-teach `STATE: NOMINEES =
  ...` after a ceremony — but it is not a guaranteed, structured record.
- **No "removed nominee" / "replacement nominee" fields on POV.** `house_status` only has
  `veto_holder` and `veto_used`. The dashboard shows these as "Not available" rather than
  guessing, with a link to search Corrections, since that detail (when recorded at all) lives in
  free-text knowledge.
- **No per-dashboard-user identity on Julie's side.** `author_id` on every write is whatever
  integer the caller supplies — this dashboard sends the *dashboard* user's own numeric ID
  (assigned by this repo's local user table), not a Discord user ID, since dashboard moderators
  don't necessarily have one. Audit trail for "who did this" therefore lives in this dashboard's
  own audit log, not in Julie's knowledge records.
- **No session/API-key scoping.** The one `ADMIN_API_KEY` grants full read/write access to
  everything below `/api/v1/*` — there's no way to issue a read-only key. This dashboard's own
  RBAC (viewer/moderator/admin) is what actually restricts who can trigger a write, entirely on
  this side of the boundary.
- **No rate limiting visible from the response.** If Julie's admin API is ever rate-limited in the
  future, this dashboard has no way to detect or display that today (no `429` handling exists
  because no route currently returns one).

None of these are things this dashboard can fix by itself — they'd require production-side
changes to JulieChenBot, which is out of scope for this repo and wasn't authorized here.
