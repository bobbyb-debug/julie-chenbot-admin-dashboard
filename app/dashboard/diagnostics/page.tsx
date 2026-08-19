import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { formatTimestamp } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

function statusFromMonitor(status: string | undefined): Status {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "attention";
  if (status === "unhealthy") return "problem";
  return "unknown";
}

const TRACES = [
  {
    title: "House Status Image Update",
    steps: ["Joker's Updates", "RSS Parser", "House Status Monitor", "IMAGE_CHANGED", "Discord Router", "#house-status + #live-updates"],
  },
  {
    title: "Competition Winner",
    steps: ["Joker's Updates", "RSS Parser", "Competition Monitor", "COMPETITION_WINNER", "Discord Router", "#live-updates"],
  },
];

export default async function DiagnosticsPage() {
  const result = await safeJulieCall(() => julie.diagnostics());

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const { health, watcher, pending_events, recent_warnings } = result.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Diagnostics</h1>
          <p className="text-sm text-text-muted">Real troubleshooting data, straight from the engine.</p>
        </div>
        <StatusBadge status={health.status === "healthy" ? "healthy" : "attention"} label={health.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Uptime" value={health.uptime} />
        <Stat label="Production Cycles" value={String(health.tick_count)} />
        <Stat label="Errors" value={String(health.error_count)} />
        <Stat label="Pending Events" value={String(health.pending_events)} />
      </div>

      {health.last_error && (
        <Card title="⚠️ Last Error" className="border-status-problem/40">
          <p className="text-sm text-text-secondary">{health.last_error}</p>
        </Card>
      )}

      {watcher.failed_monitors.length > 0 && (
        <Card title="Failed Monitors" className="border-status-problem/40">
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {watcher.failed_monitors.map((f) => (
              <li key={f.name}>
                <strong className="text-status-problem">{f.name}</strong>: {f.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Monitors">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {health.monitors.length === 0 ? (
            <EmptyState title="No monitor cycle has run yet" />
          ) : (
            health.monitors.map((m) => (
              <li key={m.monitor} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <span className="text-sm text-text-primary">{m.monitor}</span>
                  <p className="text-xs text-text-muted">{m.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-text-muted">
                  <span>{m.duration_ms.toFixed(0)}ms</span>
                  <StatusBadge status={statusFromMonitor(m.status)} label={m.status} />
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card title="Pending Events" subtitle="Queued but not yet delivered">
        {pending_events.length === 0 ? (
          <p className="text-sm text-status-healthy">None -- everything has been delivered.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {pending_events.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-text-primary">{e.title}</span>
                <SeverityBadge severity={e.severity} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent Warnings">
        {recent_warnings.length === 0 ? (
          <p className="text-sm text-status-healthy">No warnings in recent activity.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {recent_warnings.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <span className="text-sm text-text-primary">{e.title}</span>
                  <p className="text-xs text-text-muted">{e.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={e.severity} />
                  <span className="text-xs text-text-muted">{formatTimestamp(e.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Reference Event Traces" subtitle="How events flow through the pipeline (static reference, not a live trace)">
        <div className="flex flex-col gap-4">
          {TRACES.map((trace) => (
            <div key={trace.title}>
              <p className="mb-2 text-xs font-medium text-text-secondary">{trace.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {trace.steps.map((step, i) => (
                  <span key={step} className="flex items-center gap-1.5">
                    <span className="rounded-lg bg-bg-elevated px-2.5 py-1 text-xs text-text-primary">{step}</span>
                    {i < trace.steps.length - 1 && <span className="text-text-muted">→</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  );
}
