# Julie ChenBot Admin Dashboard

## Project

**Julie ChenBot Control Room** — a secure admin dashboard for
[Julie ChenBot](https://github.com/bobbyb-debug/JulieChenBot), the Big Brother recap/game-tracking
Discord bot. This is a separate repository, separately deployed, talking to Julie only over her
authenticated admin API — never sharing code, a process, or a database with the bot itself.

## Purpose

Built for Bobby and trusted moderators who need to, at a glance:

- See what Julie currently believes (game state, taught knowledge) and where it came from.
- See what changed recently, and whether anything is broken.
- Safely teach or correct Julie — with a review-then-apply flow, not a fire-and-forget form —
  without memorizing Discord slash commands.

**This dashboard is never a required dependency for Julie's normal operation.** If the dashboard
goes down, Julie's Discord bot, scheduler, and monitors keep running unaffected. If Julie goes
down, the dashboard stays up and clearly reports that Julie is offline rather than showing stale
or fabricated data.

## Architecture

```
Browser  →  Dashboard server (this app)  →  Julie's admin API (separate Railway app)
                     │
                     ▼
          own SQLite (users, audit log)
```

The browser never talks to Julie's API directly and never sees the production API key — every
request to Julie goes through this app's own server (Server Components for reads, Server Actions
for writes). Full detail, including why this shape was chosen over the more common
`NEXT_PUBLIC_API_URL` client-fetch pattern: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

**Tech stack**: Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4 + `lucide-react`
for icons. Backend/security logic (`node:sqlite` for the local user/audit database, `node:crypto`
for password hashing and signed sessions) uses only Node's own built-ins — **zero** new
dependencies beyond Next/React/Tailwind/lucide-react for the whole app.

## Local development

Requires Node.js 22+ (uses `node:sqlite`, stable since Node 22.5).

```bash
npm install
cp .env.example .env.local   # fill in the variables below
node scripts/create-admin.ts you@example.com "a-strong-password-12+chars" admin
npm run dev
```

Open http://localhost:3000 and sign in. You don't need a live Discord bot to develop against —
Julie's admin API can run standalone; see **[docs/local-julie-api.md](docs/local-julie-api.md)**
for a ready-to-adapt script.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Yes | Random string, 32+ chars, signs session cookies. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JULIE_API_URL` | Yes | Base URL of Julie's admin API — production: `https://juliechenbot-production.up.railway.app` |
| `JULIE_API_KEY` | Yes | Must match `ADMIN_API_KEY` configured on the Julie ChenBot process. **Server-side only — never `NEXT_PUBLIC_*`.** |
| `DASHBOARD_DATA_DIR` | No | Where `dashboard.db` lives (default: `./data`) — point this at a persistent volume in production |
| `NEXT_PUBLIC_APP_NAME` | No | Display name shown in the UI (default: "Julie ChenBot Control Room") |

None of these are committed — `.env.local` is gitignored, and `.env.example` lists names only,
never values. See `docs/API.md` for exactly why `JULIE_API_URL`/`JULIE_API_KEY` are deliberately
*not* `NEXT_PUBLIC_*` variables.

## Security

- **The production API key never reaches the browser.** Every call to Julie's admin API happens
  server-side (Server Components / Server Actions) — never in client-side JavaScript, never in
  `localStorage`, never in a URL, never logged.
- **Passwords**: scrypt-hashed (Node's built-in `node:crypto`), 12-character minimum, never
  stored or logged in plain text.
- **Sessions**: signed httpOnly cookies (`SameSite=Lax`, `Secure` in production, 8-hour expiry,
  HMAC-SHA256). Per-email login rate limiting (10 attempts / 15 minutes).
- **RBAC**, enforced server-side on every mutating Server Action — never just hidden in the UI:

  | Role | Can do |
  |---|---|
  | **Viewer** | View everything: game state, knowledge, sources, diagnostics, audit log |
  | **Moderator** | Everything a Viewer can, plus teach/correct/deactivate knowledge and update game state |
  | **Admin** | Everything a Moderator can, plus user management and settings |

- **CSRF**: Next.js Server Actions validate the request `Origin` server-side by default;
  `lib/origin-check.ts` adds an explicit same-origin check as defense in depth.
- **Audit log**: every mutation (teach, correct, deactivate, state update, user/role change,
  login/logout) is recorded with actor, action, object, result, and timestamp — visible on the
  Settings page.
- **No fake data, ever.** If Julie's API doesn't expose a field, the UI says "Not available," not
  a guess — see `docs/API.md`'s "Missing capabilities" section for the specific fields this
  applies to (original nominees, veto removal/replacement).
- Never commit `.env*` files (gitignored) or `data/*.db*` (gitignored).

## API connection

This dashboard is a pure client of Julie's admin API — it owns no game state, knowledge, or
Discord routing data of its own. Full endpoint-by-endpoint contract, including exact response
shapes and what's deliberately *not* exposed: **[docs/API.md](docs/API.md)**.

Production is live and verified:
```
GET /health                                    → 200 {"status":"ok"}
GET /api/v1/health (no auth)                   → 401
GET /api/v1/health (valid ADMIN_API_KEY)        → 200, engine healthy/running
```

## Deployment

Any Node.js host that supports Next.js works. **Recommended: Vercel** — zero-config for Next.js
App Router/Server Actions, and this app's only local state (`data/dashboard.db`) is small enough
to justify swapping to a managed store rather than fighting Vercel's ephemeral filesystem (see
below). **Alternative: Railway** — already used for the bot, supports a persistent volume
directly, no storage-layer change needed.

Two things to get right regardless of platform:

1. **Persistent storage for `data/dashboard.db`.** On a platform with a persistent disk (Railway,
   a VM), attach a volume and set `DASHBOARD_DATA_DIR` to it — same pattern Julie's own
   `STATE_DIR` uses. On Vercel specifically, the filesystem is ephemeral per-invocation, so
   `node:sqlite` won't persist across deploys/instances there without an external volume — using
   Vercel would mean either accepting that (fine for a single evaluator instance) or swapping the
   user/audit storage layer for something Vercel-native (e.g. Vercel Postgres) before real
   production use.
2. **Network reachability to Julie's admin API.** `JULIE_API_URL` must be reachable from wherever
   this app runs — already true today, since the production API is on a public Railway domain.

```bash
npm run build
npm run start
```

**Health check**: any authenticated route (e.g. `/dashboard`) returning 200. The root `/`
redirects based on session state, so it's not a meaningful unauthenticated health check by
itself. **Rollback**: this app is stateless aside from `data/dashboard.db` — redeploying a
previous build is safe at any time and never affects Julie's own state.

**This app has not been deployed yet** — see the final report in this project's session notes for
the exact environment variables and domain configuration needed before deploying.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run test         # node --test tests/*.test.ts
npm run build         # production build (also type-checks)
```

`npm run test` covers the pure logic layer: password hashing, session signing/tampering/expiry,
RBAC rank comparisons, same-origin checks, and the user/audit-log SQLite layer (24 tests). UI
flows (login, RBAC gating, batch teaching preview→apply, conflict detection, knowledge
deactivation with the confirmation dialog, toast notifications, and graceful offline handling)
were verified by hand against a running instance of both this app and Julie's admin API — see
this project's session notes for the exact flows exercised. There's no component-testing
framework in this repo (no jsdom/Testing Library) — adding one is reasonable future work if the
UI surface keeps growing, but wasn't justified for the current page count against "avoid
unnecessary dependencies."

## Troubleshooting

**"Julie is offline" everywhere, but you know the bot is up.** Check `JULIE_API_URL` and
`JULIE_API_KEY` in your environment — a wrong key produces the same "offline" UI as a genuinely
unreachable API, since both paths return a non-2xx/failed fetch from `lib/julie-client.ts`.
Confirm directly: `curl -H "Authorization: Bearer $JULIE_API_KEY" $JULIE_API_URL/api/v1/health`.

**Login says "Incorrect email or password" but you're sure it's right.** Passwords are
case-sensitive and there's no reset flow yet — recreate the account with
`node scripts/create-admin.ts` (emails are unique, so use a different address, or have an admin
disable the old one first).

**"Too many attempts" on login.** Rate-limited at 10 attempts per 15 minutes per email, tracked
in `data/dashboard.db`. Wait it out, or delete the `login_attempts` table's rows for that email if
you have direct database access.

**`node:sqlite` errors on startup.** You're likely on Node < 22.5. Check with `node --version`.

**A page shows stale data.** Pages auto-refresh every 30 seconds while the tab is visible
(paused when hidden) and show "Updated Xs ago" in the top bar — use the manual refresh button
there, or `Ctrl+R`, if you need it sooner.

**Changes to `.env.local` aren't taking effect.** Restart `npm run dev` — Next.js only reads
`.env*` files at process start.

## Deferred / future work

Documented rather than built, because each needs either architectural changes on Julie's side or
is out of scope for this version — see `docs/API.md`'s "Missing capabilities" for the API-side
gaps specifically.

- **Free-text batch teaching** (paste a paragraph, get proposed structured changes via AI
  parsing). Deliberately not built — it would mean a second place deciding how text becomes
  knowledge, with real hallucination risk, competing with `/teach batch`'s existing strict
  `FACT:`/`RULE:`/`STATE:` syntax. The dashboard reuses that exact syntax instead.
- **Server-side session revocation** (e.g. "log out everywhere"). Would need a session table
  instead of stateless signed cookies; rotating `SESSION_SECRET` invalidates every session at
  once as a blunt substitute today.
- **Recap source inspection** (browse the exact live-feed entries behind one `/recap` output).
  Julie's `recent_updates()` only returns text, not enough structure to reconstruct this without
  a production-side change.
- **Mobile phone layout.** Verified at tablet (768px) and desktop widths; the sidebar has no
  responsive collapse below that.
- **Optimistic concurrency for simultaneous moderator edits.** Two moderators editing the same
  STATE topic at once will both succeed (last write wins, same as two people running
  `/teach update` back to back on Discord today) — no version/lock mechanism yet. The Conflicts
  panel surfaces *automated-source-vs-taught* disagreement, not *moderator-vs-moderator* races.
- **Component-level tests** (React Testing Library or similar) for the client components
  (`TeachWorkspace`, `ConfirmDialog`, `ToastProvider`). Today's test suite covers the
  auth/session/RBAC/storage logic these components call through Server Actions, but not the
  components' own rendering/interaction logic directly.
