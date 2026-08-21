import Link from "next/link";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { Timestamp } from "@/components/Timestamp";
import { getSession } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { hasRole } from "@/lib/rbac";
import { safeJulieCall } from "@/lib/safe-julie";
import { visibleKnowledgeActions } from "@/lib/knowledge-actions";
import { activeQueryValue, resolveActiveFilter, type ActiveFilter } from "@/lib/knowledge-filters";
import { activeStateRole, officialGameFacts, otherCurrentStateTopics, parseVetoUsed } from "@/lib/official-state";
import type { GameStateResponse, OfficialStateItem } from "@/lib/julie-types";
import { CorrectButton } from "./CorrectButton";
import { DeactivateButton } from "./[id]/DeactivateButton";
import { ReactivateButton } from "./[id]/ReactivateButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All" },
  { key: "fact", label: "Facts" },
  { key: "rule", label: "Rules" },
  { key: "correction", label: "Corrections" },
  { key: "state", label: "State" },
];

const PAGE_SIZES = [25, 50, 100, 200];

type KnowledgeSearchParams = { type?: string; active?: string; q?: string; limit?: string; page?: string };

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<KnowledgeSearchParams>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const canTeach = session ? hasRole(session.role, "moderator") : false;

  // Defaults to "Active" (not "All"): the normal view should
  // emphasize current active knowledge, with the full history still
  // one click away via the filter below -- see lib/knowledge-filters.ts.
  const activeFilter = resolveActiveFilter(params.active);

  const query: Record<string, string> = {};
  if (params.type && params.type !== "all") query.type = params.type;
  const activeQuery = activeQueryValue(activeFilter);
  if (activeQuery) query.active = activeQuery;

  const [result, gameState] = await Promise.all([
    safeJulieCall(() => julie.listKnowledge(query)),
    safeJulieCall(() => julie.gameState()),
  ]);

  // Search is applied here rather than sent to the bot's `q` filter
  // (which only matches `content`) so a search can also match an
  // entry's type or topic/entity ("Kamu", "state") -- no bot-side
  // change needed, since GET /api/v1/knowledge already returns every
  // field this needs.
  let items = result.ok ? result.data : [];
  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.content.toLowerCase().includes(needle) ||
        item.type.toLowerCase().includes(needle) ||
        (item.topic ?? "").toLowerCase().includes(needle),
    );
  }

  const pageSize = PAGE_SIZES.includes(Number(params.limit)) ? Number(params.limit) : 25;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text-primary">Knowledge Center</h1>
          <p className="text-sm text-text-muted">What Julie currently knows -- and everything she&apos;s ever been taught.</p>
        </div>
        {canTeach && (
          <Link
            href="/dashboard/knowledge/teach"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            + Teach Julie
          </Link>
        )}
      </div>

      {gameState.ok && <CurrentStatePanel gameState={gameState.data} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
          {TABS.map((tab) => {
            const active = (params.type ?? "all") === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildHref(params, { type: tab.key !== "all" ? tab.key : undefined, page: undefined })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusToggle params={params} activeFilter={activeFilter} />
          <form action="/dashboard/knowledge" className="flex w-full items-center gap-2 sm:w-auto">
            {params.type && <input type="hidden" name="type" value={params.type} />}
            {params.active && <input type="hidden" name="active" value={params.active} />}
            {params.limit && <input type="hidden" name="limit" value={params.limit} />}
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Search content, type, or topic..."
              className="w-full min-w-0 rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent sm:w-56"
            />
          </form>
        </div>
      </div>

      <Card>
        {!result.ok ? (
          <JulieOfflineState detail={result.message} />
        ) : total === 0 ? (
          <EmptyState
            title="No knowledge found"
            hint={
              params.q
                ? `Nothing matches "${params.q}". Try a different search or filter.`
                : activeFilter === "true"
                  ? "No active knowledge matches this filter. Check Deactivated, or teach Julie something new."
                  : "Try a different filter, or teach Julie something new."
            }
          />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border-subtle">
              {pageItems.map((item) => {
                const actions = visibleKnowledgeActions(item, canTeach);
                const hasActions = actions.showCorrect || actions.showDeactivate || actions.showReactivate;
                const role = activeStateRole(item);

                return (
                  <li key={item.id} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/dashboard/knowledge/${item.id}`}
                      className="flex min-w-0 flex-1 items-start justify-between gap-4 -mx-2 rounded-lg px-2 py-1 hover:bg-bg-hover"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-text-muted">#{item.id}</span>
                          <KnowledgeTypeBadge type={item.type} />
                          {item.topic && (
                            <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                              {item.topic}
                            </span>
                          )}
                          {role === "official" && (
                            <span
                              className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong"
                              title="This is the current value shown in Current Game State above."
                            >
                              Official
                            </span>
                          )}
                          {role === "current" && (
                            <span
                              className="rounded-full bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
                              title="This is the current admin-confirmed value for this topic."
                            >
                              Current
                            </span>
                          )}
                          {!item.active && (
                            <span className="rounded bg-status-problem/10 px-1.5 py-0.5 text-[10px] font-medium text-status-problem">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <p className={`mt-1 truncate text-sm ${item.active ? "text-text-primary" : "text-text-muted line-through"}`}>
                          {item.content}
                        </p>
                      </div>
                      <Timestamp value={item.created_at} className="shrink-0 text-xs text-text-muted" />
                    </Link>
                    {hasActions && (
                      <div className="flex shrink-0 items-center gap-1 pt-1">
                        {actions.showCorrect && (
                          <CorrectButton itemId={item.id} originalContent={item.content} compact />
                        )}
                        {actions.showDeactivate && <DeactivateButton itemId={item.id} compact />}
                        {actions.showReactivate && <ReactivateButton itemId={item.id} compact />}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <PaginationBar
              params={params}
              pageSize={pageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              start={start}
              shown={pageItems.length}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function CurrentStatePanel({ gameState }: { gameState: GameStateResponse }) {
  const { hoh, nominees, vetoWinner, vetoUsed, haveNots } = officialGameFacts(gameState);
  const otherTopics = otherCurrentStateTopics(gameState);

  const usedParsed = parseVetoUsed(vetoUsed?.content);
  const fields: { label: string; item: OfficialStateItem | undefined; display?: string }[] = [
    { label: "HOH", item: hoh },
    { label: "Nominees", item: nominees },
    { label: "Veto Winner", item: vetoWinner },
    { label: "Veto Used", item: vetoUsed, display: usedParsed === undefined ? undefined : usedParsed ? "Yes" : "No" },
    { label: "Have-Nots", item: haveNots },
  ];

  return (
    <Card
      title="Current Game State"
      subtitle="What's true right now -- admin-confirmed here, never overwritten by the automated live feed."
      action={
        <Link
          href="/dashboard/knowledge/teach?mode=state"
          className="shrink-0 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-accent-strong"
        >
          Update State
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0 rounded-lg border border-border-subtle p-3">
            <div className="text-xs font-medium text-text-secondary">{f.label}</div>
            {f.item ? (
              <>
                <div className="mt-1 truncate text-sm font-semibold text-text-primary" title={f.item.content}>
                  {f.display ?? f.item.content}
                </div>
                <div className="mt-0.5 text-[10px] text-text-muted">Set {formatRelative(f.item.updated_at)}</div>
              </>
            ) : (
              <div className="mt-1 text-sm italic text-text-muted">Not confirmed yet</div>
            )}
          </div>
        ))}
      </div>

      {otherTopics.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-3">
          <p className="mb-2 text-xs font-medium text-text-secondary">
            Other current state -- no dedicated field of its own
          </p>
          <ul className="flex flex-col gap-1.5">
            {otherTopics.map((item) => (
              <li key={item.topic} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="shrink-0 font-medium text-text-primary">{item.topic.replace(/_/g, " ")}</span>
                <span className="min-w-0 text-right text-text-secondary">{item.content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function PaginationBar({
  params,
  pageSize,
  currentPage,
  totalPages,
  total,
  start,
  shown,
}: {
  params: KnowledgeSearchParams;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  total: number;
  start: number;
  shown: number;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
      <p className="text-xs text-text-muted">
        Showing {shown === 0 ? 0 : start + 1}–{start + shown} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
          {PAGE_SIZES.map((size) => (
            <Link
              key={size}
              href={buildHref(params, { limit: String(size), page: undefined })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                pageSize === size ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PageLink params={params} page={currentPage - 1} disabled={currentPage <= 1} label="Prev" />
            <span className="px-1 text-xs text-text-muted">
              {currentPage} / {totalPages}
            </span>
            <PageLink params={params} page={currentPage + 1} disabled={currentPage >= totalPages} label="Next" />
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  params,
  page,
  disabled,
  label,
}: {
  params: KnowledgeSearchParams;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text-muted opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={buildHref(params, { page: String(page) })}
      className="rounded-md border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
    >
      {label}
    </Link>
  );
}

function buildHref(params: KnowledgeSearchParams, overrides: Partial<KnowledgeSearchParams>): string {
  const next = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (next.type) search.set("type", next.type);
  if (next.active) search.set("active", next.active);
  if (next.q) search.set("q", next.q);
  if (next.limit) search.set("limit", next.limit);
  if (next.page) search.set("page", next.page);
  const qs = search.toString();
  return `/dashboard/knowledge${qs ? `?${qs}` : ""}`;
}

function StatusToggle({ params, activeFilter }: { params: KnowledgeSearchParams; activeFilter: ActiveFilter }) {
  // "Active" is the default -- selecting it clears the URL param
  // entirely (matches resolveActiveFilter()'s default), so the
  // normal/no-filter URL is the clean one.
  const options: { key: ActiveFilter; label: string; hrefValue: string | undefined }[] = [
    { key: "true", label: "Active", hrefValue: undefined },
    { key: "all", label: "All", hrefValue: "all" },
    { key: "false", label: "Deactivated", hrefValue: "false" },
  ];

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
      {options.map((opt) => (
        <Link
          key={opt.key}
          href={buildHref(params, { active: opt.hrefValue, page: undefined })}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            activeFilter === opt.key ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
