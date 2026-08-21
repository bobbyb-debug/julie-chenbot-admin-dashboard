import { Card } from "@/components/Card";
import { JulieOfflineState } from "@/components/EmptyState";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

export default async function DiscordPage() {
  const result = await safeJulieCall(() => julie.discordRouting());

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const { channels, routing } = result.data;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Discord</h1>
        <p className="text-sm text-text-muted">
          Channel configuration and event routing, read live from Julie&apos;s own router --
          this can never drift from what actually happens.
        </p>
      </div>

      <Card title="Channels">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {Object.entries(channels).map(([name, info]) => (
            <li key={name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
              <span className="min-w-0 truncate text-text-primary">{info.channel}</span>
              <span className={`shrink-0 ${info.configured ? "text-status-healthy" : "text-text-muted"}`}>
                {info.configured ? `ID ${info.channel_id}` : "Not configured"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Event Routing">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {Object.entries(routing).map(([eventType, entry]) => (
            <li key={eventType} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <span className="font-mono text-xs text-text-primary">{eventType}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {entry.destinations.length === 0 ? (
                  <span className="text-xs text-text-muted">no destination</span>
                ) : (
                  entry.destinations.map((d) => (
                    <span
                      key={d.channel}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        d.configured
                          ? "bg-accent/15 text-accent-strong"
                          : "bg-status-problem/10 text-status-problem"
                      }`}
                      title={d.configured ? `Channel ID ${d.channel_id}` : "Not configured -- undeliverable"}
                    >
                      {d.channel}
                    </span>
                  ))
                )}
                {entry.escalates_to_production_log_on_warning && (
                  <span className="text-[10px] text-text-muted">+ #production-log on warning/important/critical</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
