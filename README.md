# Julie ChenBot — Control Room

A secure admin dashboard for [Julie ChenBot](https://github.com/bobbyb-debug/JulieChenBot), the Big Brother
recap/game-tracking Discord bot. Built for Bobby and trusted moderators who need to see what Julie
currently believes, where that information came from, and safely teach or correct her — without
memorizing Discord slash commands.

**This is a separate, independently deployable app.** It never becomes a required dependency for
Julie's normal operation: if the dashboard goes down, Julie keeps running unaffected. If Julie goes
down, the dashboard stays up and clearly reports that Julie is offline.

## Architecture

```
┌─────────────────────┐        HTTPS, bearer token        ┌──────────────────────────┐
│  This dashboard      │ ────────────────────────────────▶ │  JulieChenBot process     │
│  (Next.js app)       │                                    │  admin_api/ (aiohttp)     │
│                      │ ◀──────────────────────────────── │  same event loop as the   │
│  - login/session     │           JSON responses           │  Discord bot + scheduler  │
│  - RBAC              │                                    └──────────────────────────┘
│  - audit log         │
│  (own SQLite file)   │
└─────────────────────┘
```

- **Source of truth**: Julie's own `ProductionEngine` (knowledge store, game state, monitors).
  This dashboard never reads Julie's `storage.json` or SQLite files directly — every read and
  write goes through Julie's admin API (`admin_api/` in the JulieChenBot repo), the same narrow
  HTTP surface documented in that repo's `docs/admin_api.md`.
- **This app's own data**: dashboard user accounts, sessions, and the audit log live in a small
  local SQLite database (`data/dashboard.db`, via Node's built-in `node:sqlite` — no native
  dependency). This is entirely separate from anything Julie owns.
- **No duplicate business logic**: batch teaching and state updates call the exact same
  parse/plan/apply functions Julie's `/teach batch` and `/teach update` Discord commands use.
  There is exactly one place that decides how text becomes knowledge.

## Tech stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4** — server components fetch data
  directly from Julie's admin API; mutations go through Next.js Server Actions (which get
  built-in CSRF protection), not a hand-rolled REST layer.
- **`node:sqlite`** for the dashboard's own users/audit-log storage — no native compiled
  dependency (`better-sqlite3`, etc.), ships with Node itself.
- **`node:crypto`** (`scrypt` for password hashing, HMAC-SHA256 for signed session cookies) —
  no `bcrypt`/`jose`/auth library dependency.

Deliberately minimal dependencies: outside of Next/React/Tailwind, this app adds **zero** new
npm packages for its backend logic.

## Local development

Requires Node.js 22+ (uses `node:sqlite`, stable as of Node 22.5+).

```bash
npm install
cp .env.example .env.local   # fill in the three variables below
node scripts/create-admin.ts you@example.com "a-strong-password-12+chars" admin
npm run dev
```

Open http://localhost:3000 and sign in.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Yes | Random string, 32+ chars, signs session cookies. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JULIE_API_URL` | Yes | Base URL of Julie's admin API, e.g. `https://julie.example.com:8080` |
| `JULIE_API_KEY` | Yes | Must match `ADMIN_API_KEY` configured on the Julie ChenBot process |
| `DASHBOARD_DATA_DIR` | No | Where `dashboard.db` lives (default: `./data`) — point this at a persistent volume in production |

None of these are committed. `.env.local` is gitignored.

### Running without a real Julie bot

You don't need a live Discord bot to develop against. Julie's admin API can run standalone (no
`DISCORD_TOKEN` required) against a `ProductionEngine` you construct in a small script — see
`docs/local-julie-api.md` in this repo for a ready-to-adapt example.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run test         # node --test tests/*.test.ts — password hashing, session
                      #   signing/tampering/expiry, RBAC, same-origin checks,
                      #   and the user/audit-log SQLite layer
npm run build         # production build (also type-checks)
```

UI/integration behavior (login, RBAC gating, batch teaching preview→apply, conflict detection,
knowledge deactivation, offline handling) was verified by hand against a running instance —
see the project's session notes for the exact flows exercised.

## Authentication & authorization

- Email + password (scrypt-hashed, 12-character minimum), signed httpOnly session cookie
  (`SameSite=Lax`, 8-hour expiry, `Secure` in production).
- Per-email login rate limiting (10 attempts / 15 minutes), backed by the local database.
- Three roles, enforced server-side on every mutating action (never just hidden in the UI):

  | Role | Can do |
  |---|---|
  | **Viewer** | View everything: game state, knowledge, sources, diagnostics, audit log |
  | **Moderator** | Everything a Viewer can, plus teach/correct/deactivate knowledge and update game state |
  | **Admin** | Everything a Moderator can, plus user management and settings |

- CSRF: Next.js Server Actions validate the request `Origin` server-side by default; API-adjacent
  helpers add an explicit same-origin check as defense in depth (`lib/origin-check.ts`).
- The `JULIE_API_KEY` never reaches the browser — every call to Julie's admin API happens
  server-side (Server Components / Server Actions), never from client-side JavaScript.

## Deployment

Any Node.js host that supports Next.js works (Vercel, Railway, a plain VM). Two things to get
right:

1. **Persistent storage for `data/dashboard.db`.** On Vercel, that means an external volume or
   switching the storage layer — Vercel's filesystem is ephemeral. On Railway (or a VM), attach a
   persistent volume and point `DASHBOARD_DATA_DIR` at it, the same pattern Julie's own
   `STATE_DIR` already uses.
2. **Network reachability to Julie's admin API.** `JULIE_API_URL` must be reachable from wherever
   this app runs. If Julie is on Railway, either expose the admin API port publicly (behind the
   bearer-token auth) or deploy the dashboard on the same private network.

```bash
npm run build
npm run start
```

Health check: any authenticated route (e.g. `/dashboard`) returning 200. The root `/` redirects
to `/login` or `/dashboard` depending on session state, so it's not a meaningful unauthenticated
health check by itself.

**Rollback**: this app is stateless aside from `data/dashboard.db` (user accounts + audit log) —
redeploying a previous build is safe at any time; nothing about Julie's own state is affected.

## Security notes

- Never commit `.env*` files (already gitignored) or `data/*.db*`.
- The admin API key and session secret are the two secrets this app holds. Rotate the session
  secret to invalidate every active dashboard session immediately (there is no separate
  server-side session revocation list yet — see "Deferred" below).
- Knowledge deactivation is soft-delete only (mirrors Julie's own `KnowledgeStore.forget()`) —
  history is never destroyed.

## Deferred / future work

Documented rather than built, because each needs either architectural changes on Julie's side or
is out of scope for a first version:

- **Free-text batch teaching** (paste a paragraph, get proposed structured changes via AI
  parsing). Deliberately not built — it would mean a second place deciding how text becomes
  knowledge, with real hallucination risk, competing with `/teach batch`'s existing strict
  `FACT:`/`RULE:`/`STATE:` syntax. The dashboard reuses that exact syntax instead.
- **Server-side session revocation** (e.g. "log out everywhere," forced session expiry on role
  change without waiting for the 8-hour cookie TTL). Would need a session table instead of
  stateless signed cookies.
- **Recap source inspection** (browse the exact live-feed entries that fed one `/recap` output).
  Julie's `recent_updates()` only returns text, not enough structure to reconstruct this without
  a production-side change.
- **Mobile phone layout.** Verified at tablet (768px) and desktop widths per the original brief;
  the fixed sidebar has no responsive collapse for phone-width screens.
- **Optimistic concurrency / conflict resolution UI for simultaneous moderator edits.** Two
  moderators editing the same STATE topic at once will both succeed (last write wins, same as
  two people running `/teach update` back to back on Discord today) — no version/lock mechanism
  yet. The Conflicts panel surfaces *automated-source-vs-taught* disagreement, not
  *moderator-vs-moderator* races.
