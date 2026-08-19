import Link from "next/link";
import { Card } from "@/components/Card";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";
import { attentionItems, buildComponentStatuses, overallStatus } from "@/lib/health-view";
import { formatRelative, formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

async function loadOverview() {
  const [health, gameState, sources, conflicts, events] = await Promise.all([
    julie.health(),
    julie.gameState(),
    julie.sources(),
    julie.conflicts(),
    julie.events(8),
  ]);
  return { health, gameState, sources, conflicts, events };
}

export default async function OverviewPage() {
  const result = await safeJulieCall(loadOverview);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-2xl pt-12">
        <JulieOfflineState detail={result.offline ? result.message : undefined} />
        {!result.offline && <p className="mt-4 text-center text-sm text-status-problem">{result.message}</p>}
      </div>
    );
  }

  const { health, gameState, sources, conflicts, events } = result.data;
  const components = buildComponentStatuses(health.engine, sources);
  const overall = overallStatus(health.engine, components, conflicts.conflicts, sources.monitors.failed_monitors.length);
  const attention = attentionItems(health.engine, conflicts.conflicts, sources.monitors.failed_monitors);

  const houseStatus = gameState.house_status;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">System Status</h1>
          <StatusBadge status={overall} />
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {components.map((component) => (
              <div key={component.name} className="rounded-lg border border-border-subtle p-3">
                <div className="mb-1 text-xs font-medium text-text-secondary">{component.name}</div>
                <StatusBadge status={component.status} />
                <p className="mt-1.5 line-clamp-2 text-xs text-text-muted" title={component.detail}>
                  {component.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Engine uptime: {health.engine.uptime} · {health.engine.tick_count} production cycle(s) ·
            last tick {formatRelative(health.engine.last_tick_at)}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Current Game</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GameCard label="Head of Household" value={houseStatus.hoh} />
          <GameCard label="Nominees" value={houseStatus.nominees.join(", ")} />
          <GameCard
            label="Power of Veto"
            value={houseStatus.veto_holder}
            hint={houseStatus.veto_holder ? (houseStatus.veto_used ? "Used" : "Not used") : undefined}
          />
          <GameCard label="Have-Nots" value={houseStatus.have_nots.join(", ")} />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Source: House Status monitor · as of {formatTimestamp(houseStatus.timestamp)}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Attention Needed</h2>
        <Card>
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-status-healthy">
              <span aria-hidden>🟢</span> Everything looks good.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {attention.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-status-attention">
                  <span aria-hidden>⚠️</span>
                  <span className="text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
          <Link href="/dashboard/activity" className="text-xs text-accent-strong hover:underline">
            View all →
          </Link>
        </div>
        <Card>
          {events.length === 0 ? (
            <EmptyState title="No activity yet" hint="Delivered events will show up here." />
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {events.map((event, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{event.title}</span>
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <p className="text-xs text-text-muted">
                      {event.source} · {event.delivered_to.length ? `→ #${event.delivered_to.join(", #")}` : "no destination"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatRelative(event.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function GameCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-text-primary" title={value}>
        {value || "—"}
      </div>
      {hint && <div className="mt-0.5 text-xs text-text-muted">{hint}</div>}
    </div>
  );
}
