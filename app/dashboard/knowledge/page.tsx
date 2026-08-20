import Link from "next/link";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { getSession } from "@/lib/auth";
import { formatTimestamp } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { hasRole } from "@/lib/rbac";
import { safeJulieCall } from "@/lib/safe-julie";
import { CorrectButton } from "./CorrectButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All" },
  { key: "fact", label: "Facts" },
  { key: "rule", label: "Rules" },
  { key: "correction", label: "Corrections" },
  { key: "state", label: "States" },
];

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; active?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const canTeach = session ? hasRole(session.role, "moderator") : false;

  const query: Record<string, string> = {};
  if (params.type && params.type !== "all") query.type = params.type;
  if (params.active) query.active = params.active;
  if (params.q) query.q = params.q;

  const result = await safeJulieCall(() => julie.listKnowledge(query));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Knowledge Center</h1>
          <p className="text-sm text-text-muted">What Julie has been explicitly taught.</p>
        </div>
        {canTeach && (
          <Link
            href="/dashboard/knowledge/teach"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            + Teach Julie
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
          {TABS.map((tab) => {
            const active = (params.type ?? "all") === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/dashboard/knowledge?${new URLSearchParams({
                  ...(tab.key !== "all" ? { type: tab.key } : {}),
                  ...(params.active ? { active: params.active } : {}),
                  ...(params.q ? { q: params.q } : {}),
                }).toString()}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <StatusToggle params={params} />
          <form action="/dashboard/knowledge" className="flex items-center gap-2">
            {params.type && <input type="hidden" name="type" value={params.type} />}
            {params.active && <input type="hidden" name="active" value={params.active} />}
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Search content..."
              className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </form>
        </div>
      </div>

      <Card>
        {!result.ok ? (
          <JulieOfflineState detail={result.message} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No knowledge found" hint="Try a different filter, or teach Julie something new." />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {result.data.map((item) => (
              <li key={item.id} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/knowledge/${item.id}`}
                  className="flex min-w-0 flex-1 items-start justify-between gap-4 -mx-2 rounded-lg px-2 py-1 hover:bg-bg-hover"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">#{item.id}</span>
                      <KnowledgeTypeBadge type={item.type} />
                      {item.topic && (
                        <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          {item.topic}
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
                  <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(item.created_at)}</span>
                </Link>
                {/* Correct is only meaningful for prose knowledge (Fact/Rule/Correction) --
                    States have their own dedicated Update State workflow (see the Game State
                    page), which is what actually changes what /hoh etc. report. */}
                {canTeach && item.active && item.type !== "state" && (
                  <div className="shrink-0 pt-1">
                    <CorrectButton itemId={item.id} originalContent={item.content} compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusToggle({ params }: { params: { type?: string; active?: string; q?: string } }) {
  const base = { ...(params.type ? { type: params.type } : {}), ...(params.q ? { q: params.q } : {}) };
  const options: { key: string | undefined; label: string }[] = [
    { key: undefined, label: "All" },
    { key: "true", label: "Active" },
    { key: "false", label: "Deactivated" },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
      {options.map((opt) => {
        const active = (params.active ?? undefined) === opt.key;
        const qs = new URLSearchParams({ ...base, ...(opt.key ? { active: opt.key } : {}) }).toString();
        return (
          <Link
            key={opt.label}
            href={`/dashboard/knowledge${qs ? `?${qs}` : ""}`}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              active ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
