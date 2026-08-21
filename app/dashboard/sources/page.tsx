import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { IconTitle } from "@/components/IconTitle";
import { JulieOfflineState } from "@/components/EmptyState";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { Timestamp } from "@/components/Timestamp";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

function statusFromMonitor(status: string | undefined): Status {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "attention";
  if (status === "unhealthy") return "problem";
  return "unknown";
}

export default async function SourcesPage() {
  const result = await safeJulieCall(() => julie.sources());

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const { rss, house_image, competition, hamsterwatch, monitors } = result.data;
  const monitorByName = new Map(
    monitors.monitors.map((m) => [m.name, m] as const),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Sources</h1>
        <p className="text-sm text-text-muted">
          Availability and health of every automated source feeding Julie&apos;s live-feed
          observations -- not Official Game State, which only ever changes on{" "}
          <Link href="/dashboard/game-state" className="text-accent-strong hover:underline">
            Game State
          </Link>
          .
        </p>
      </div>

      {monitors.failed_monitors.length > 0 && (
        <Card title={<IconTitle icon={AlertTriangle}>Failed to Initialize</IconTitle>} className="border-status-problem/40">
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {monitors.failed_monitors.map((f) => (
              <li key={f.name}>
                <strong className="text-status-problem">{f.name}</strong>: {f.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Joker's Updates" subtitle="Live feed RSS">
          <Row label="Feed State" value={rss.feed_state} />
          <Row label="Newest Item" value={rss.last_title || "—"} />
          <Row label="Last Published" value={<Timestamp value={rss.last_published} />} />
          <Row label="Last GUID" value={rss.last_guid || "—"} mono />
        </Card>

        <Card title="House Status Image" subtitle="Image change detection">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Monitor status</span>
            <StatusBadge status={statusFromMonitor(monitorByName.get("HouseImageMonitor")?.last_status)} />
          </div>
          <Row label="Current URL" value={house_image.url || "—"} mono />
          <Row label="Last Hash" value={house_image.last_hash ? house_image.last_hash.slice(0, 16) + "…" : "—"} mono />
        </Card>

        <Card title="Competition Monitor">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Monitor status</span>
            <StatusBadge status={statusFromMonitor(monitorByName.get("CompetitionMonitor")?.last_status)} />
          </div>
          <Row label="Type" value={competition.competition} />
          <Row label="Active" value={competition.active ? "Yes" : "No"} />
          <Row label="Winner" value={competition.winner || "—"} />
        </Card>

        <Card title="Hamsterwatch">
          {hamsterwatch ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Monitor status</span>
                <StatusBadge status={statusFromMonitor(monitorByName.get("HamsterwatchMonitor")?.last_status)} />
              </div>
              <Row label="Archive Size" value={String(hamsterwatch.archive_size)} />
              <Row label="Bootstrapping" value={hamsterwatch.bootstrapping ? "Yes (initial backfill)" : "No"} />
            </>
          ) : (
            <p className="text-sm text-status-problem">Failed to initialize -- see Diagnostics.</p>
          )}
        </Card>
      </div>

      <Card title="All Monitors">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {monitors.monitors.map((m) => (
            <li key={m.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-text-primary">{m.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">{m.enabled ? "enabled" : "disabled"}</span>
                <StatusBadge status={statusFromMonitor(m.last_status)} label={m.last_status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-text-primary ${mono ? "font-mono text-xs" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}
