import Link from "next/link";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Timestamp } from "@/components/Timestamp";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

const LIMITS = [25, 50, 100, 200];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; severity?: string; q?: string }>;
}) {
  const params = await searchParams;
  const limit = LIMITS.includes(Number(params.limit)) ? Number(params.limit) : 50;

  const result = await safeJulieCall(() => julie.events(limit));

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  let events = result.data;
  if (params.severity) {
    events = events.filter((e) => e.severity === params.severity);
  }
  if (params.q) {
    const needle = params.q.toLowerCase();
    events = events.filter(
      (e) => e.title.toLowerCase().includes(needle) || e.detail.toLowerCase().includes(needle),
    );
  }

  const severities = ["debug", "info", "notice", "warning", "important", "critical"];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Activity</h1>
        <p className="text-sm text-text-muted">Every event Julie has delivered, most recent first.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
          <FilterLink label="All" active={!params.severity} href={buildHref(params, { severity: undefined })} />
          {severities.map((s) => (
            <FilterLink
              key={s}
              label={s}
              active={params.severity === s}
              href={buildHref(params, { severity: s })}
            />
          ))}
        </div>

        <form action="/dashboard/activity" className="flex items-center gap-2">
          {params.severity && <input type="hidden" name="severity" value={params.severity} />}
          <input
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Search..."
            className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          />
        </form>

        <div className="ml-auto flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
          {LIMITS.map((l) => (
            <FilterLink key={l} label={String(l)} active={limit === l} href={buildHref(params, { limit: String(l) })} />
          ))}
        </div>
      </div>

      <Card>
        {events.length === 0 ? (
          <EmptyState title="No matching activity" />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {events.map((event, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{event.title}</span>
                    <SeverityBadge severity={event.severity} />
                    <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {event.event_type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{event.detail}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {event.source} · {event.delivered_to.length ? `→ #${event.delivered_to.join(", #")}` : "no destination recorded"}
                  </p>
                </div>
                <Timestamp value={event.created_at} className="shrink-0 text-xs text-text-muted" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function buildHref(
  params: { limit?: string; severity?: string; q?: string },
  overrides: Partial<{ limit?: string; severity?: string }>,
): string {
  const next = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (next.limit) search.set("limit", next.limit);
  if (next.severity) search.set("severity", next.severity);
  if (next.q) search.set("q", next.q);
  const qs = search.toString();
  return `/dashboard/activity${qs ? `?${qs}` : ""}`;
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
        active ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
