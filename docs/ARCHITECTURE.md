# Architecture

## The big picture

```
┌──────────────┐   HTTPS, session cookie    ┌───────────────────────┐   HTTPS, bearer token   ┌──────────────────────────┐
│   Browser    │ ─────────────────────────▶ │   Dashboard server     │ ──────────────────────▶ │  Julie ChenBot admin API │
│  (moderator) │ ◀───────────────────────── │   (this Next.js app)   │ ◀────────────────────── │  (separate Railway app)  │
└──────────────┘        rendered HTML        └───────────────────────┘        JSON              └──────────────────────────┘
                                                       │
                                                       ▼
                                              own SQLite (users,
                                               audit log only)
```

Three separate trust/data boundaries, deliberately:

1. **Browser ↔ Dashboard server.** The browser never talks to Julie's API directly and never
   sees `JULIE_API_KEY`. It authenticates to *this* app with its own login (email/password →
   signed httpOnly session cookie). All data fetching and every mutation happen in Server
   Components and Server Actions — code that only ever runs on the dashboard's own server.
2. **Dashboard server ↔ Julie's admin API.** One shared secret (`JULIE_API_KEY`, matching
   `ADMIN_API_KEY` on Julie's side) authorizes every request. This is a machine-to-machine trust
   boundary, not a per-user one — see `docs/API.md`.
3. **Dashboard's own data.** User accounts and the audit log live in a small local SQLite
   database (`data/dashboard.db`), entirely separate from anything Julie owns. Julie's
   `storage.json`/SQLite files are never read or written directly — only ever through her admin
   API.

## Why this shape, specifically

- **No client-side fetch to Julie's API, ever.** This is why `JULIE_API_URL`/`JULIE_API_KEY` are
  plain (non-`NEXT_PUBLIC_`) server-only environment variables rather than the
  `NEXT_PUBLIC_API_URL` naming a generic template might suggest — there is no code path where the
  browser would need that URL, since it never calls Julie directly. Using `NEXT_PUBLIC_*` here
  would do nothing useful and would risk someone assuming it's safe to also expose the key the
  same way later. The BFF (backend-for-frontend) pattern this implements is exactly what keeps
  the production secret out of the browser bundle, `localStorage`, and any client-side log.
- **Mutations go through Next.js Server Actions, not a hand-rolled REST layer.** Server Actions
  get built-in same-origin/CSRF protection from the framework itself. `lib/origin-check.ts` adds
  one more explicit check as defense in depth for anything that isn't a plain Server Action.
- **No duplicated business logic.** Batch teaching and manual state updates
  (`app/dashboard/knowledge/actions.ts`) call Julie's `/api/v1/batch/*` and `/api/v1/state/*`
  endpoints, which themselves call the *exact same* parse/plan/apply functions Julie's own
  `/teach batch` and `/teach update` Discord commands use. There is exactly one place, in the
  JulieChenBot repo, that decides how text becomes knowledge — this dashboard is a second way to
  reach it, not a second implementation of it.
- **This dashboard's own auth is real, not a placeholder.** Julie's admin API has no concept of
  individual users — it only knows "the dashboard" as a whole via one shared key. So the "who is
  this specific moderator, and what are they allowed to do" question has to be answered entirely
  on this side: scrypt-hashed passwords (`lib/password.ts`), HMAC-signed session cookies
  (`lib/session.ts`), and three roles enforced server-side on every mutating Server Action
  (`lib/rbac.ts`) — viewer / moderator / admin. See the README's Security section for the full
  list of properties this gives you.
- **`node:sqlite` and `node:crypto` instead of `better-sqlite3`/`bcrypt`/an auth library.** Both
  are Node's own built-ins (stable since Node 22.5+) — this app adds zero new dependencies for
  its backend/security logic, only for UI (`lucide-react` for icons). Fewer dependencies means a
  smaller supply-chain surface for an app that holds an admin credential.
- **Server Components fetch data directly, no client-side data-fetching library.** Every
  API-backed page in `app/dashboard/**/page.tsx` is an `async` Server Component that calls
  `lib/julie-client.ts` directly and renders the result — there's no `useEffect`/`fetch` waterfall,
  no client-side cache to keep in sync, and no risk of the request ever running in the browser.
  `RefreshControl` (a small client component) drives freshness via `router.refresh()`, which
  re-runs the server fetch, rather than a separate client-side polling/cache layer.

## Failure isolation

- If **Julie's admin API is unreachable**, every page's `safeJulieCall()` (`lib/safe-julie.ts`)
  catches it and renders a clear "Julie is offline" state — the dashboard itself, its login, and
  its own settings/audit pages keep working normally (they don't depend on Julie at all).
- If **this dashboard is down**, Julie's own Discord bot, scheduler, and production monitors are
  completely unaffected — the admin API owns no state and isn't on Julie's `tick()`/`announce()`
  path (see `docs/admin_api.md` in the JulieChenBot repo).

## Request lifecycle for a mutation (e.g. deactivating a knowledge item)

1. Browser: moderator clicks Deactivate → `ConfirmDialog` → confirms.
2. Browser calls the Server Action `forgetAction(itemId)` (a normal-looking async function call;
   Next.js transports it as a same-origin POST under the hood).
3. Dashboard server: `forgetAction` checks the session role (`requireSession("moderator")`),
   calls `julie.forgetKnowledge(id)` — a server-side `fetch()` to
   `https://juliechenbot-production.up.railway.app/api/v1/knowledge/{id}/forget` with the bearer
   token attached server-side.
4. Julie's admin API: authenticates the bearer token, calls the same `KnowledgeStore.forget()`
   a Discord `/teach forget` command would call, returns `{ id, forgotten: true }`.
5. Dashboard server: records one row in the local audit log (`lib/audit.ts`), returns a plain
   result object to the browser.
6. Browser: shows a toast, refreshes the page's server data.

The bearer token and the dashboard session cookie both stay on their own respective hops — the
browser only ever sees step 6's plain JSON result.
