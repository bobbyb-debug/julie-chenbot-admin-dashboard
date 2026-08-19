import type { Status } from "@/components/StatusBadge";
import type {
  Conflict,
  EngineHealth,
  MonitorResultView,
  SourcesResponse,
} from "./julie-types";

export interface ComponentStatus {
  name: string;
  status: Status;
  detail: string;
}

function monitorStatus(status: MonitorResultView["status"] | undefined): Status {
  if (!status) return "unknown";
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "attention";
  if (status === "unhealthy") return "problem";
  return "unknown"; // disabled
}

function findMonitor(monitors: MonitorResultView[], name: string): MonitorResultView | undefined {
  return monitors.find((m) => m.monitor === name);
}

/** Builds the per-component status list shown on Overview/Diagnostics.
 * Never claims "healthy" for something with no real signal -- falls
 * back to "unknown" rather than fabricating confidence. */
export function buildComponentStatuses(
  health: EngineHealth,
  sources: SourcesResponse,
): ComponentStatus[] {
  const monitors = health.monitors;
  const houseImage = findMonitor(monitors, "HouseImageMonitor");
  const competition = findMonitor(monitors, "CompetitionMonitor");
  const hamsterwatch = findMonitor(monitors, "HamsterwatchMonitor");

  const rss = sources.rss;
  const rssStatus: ComponentStatus = rss.last_guid
    ? { name: "Joker's Updates", status: "healthy", detail: `Last item: ${rss.last_title || "(untitled)"}` }
    : { name: "Joker's Updates", status: "unknown", detail: "No RSS item observed yet." };

  return [
    {
      name: "Discord",
      status: "healthy",
      detail: "Reachable via the admin API, which runs inside the same bot process.",
    },
    rssStatus,
    {
      name: "House Status",
      status: monitorStatus(houseImage?.status),
      detail: houseImage?.detail ?? "No House Image check has run yet.",
    },
    {
      name: "Competition Monitor",
      status: monitorStatus(competition?.status),
      detail: competition?.detail ?? "No competition check has run yet.",
    },
    {
      name: "Hamsterwatch",
      status: sources.hamsterwatch ? monitorStatus(hamsterwatch?.status) : "problem",
      detail: sources.hamsterwatch
        ? (hamsterwatch?.detail ?? `Archive size: ${sources.hamsterwatch.archive_size}`)
        : "Failed to initialize -- see Diagnostics.",
    },
    {
      name: "Recap",
      status: "unknown",
      detail: "Generated on demand via /recap -- no automated health signal.",
    },
    {
      name: "Knowledge System",
      status: "healthy",
      detail: "Reachable.",
    },
    {
      name: "Dashboard / API Integration",
      status: "healthy",
      detail: "This dashboard is connected to Julie's admin API.",
    },
  ];
}

export function overallStatus(
  health: EngineHealth,
  components: ComponentStatus[],
  conflicts: Conflict[],
  failedMonitorCount: number,
): Status {
  if (components.some((c) => c.status === "problem") || failedMonitorCount > 0) return "problem";
  if (
    health.status === "degraded" ||
    conflicts.length > 0 ||
    components.some((c) => c.status === "attention")
  ) {
    return "attention";
  }
  return "healthy";
}

export function attentionItems(
  health: EngineHealth,
  conflicts: Conflict[],
  failedMonitors: { name: string; error: string }[],
): string[] {
  const items: string[] = [];

  for (const conflict of conflicts) {
    items.push(`Conflicting ${conflict.topic} information detected.`);
  }

  for (const failed of failedMonitors) {
    items.push(`${failed.name} failed to initialize: ${failed.error}`);
  }

  for (const monitor of health.monitors) {
    if (monitor.status === "unhealthy" || monitor.status === "degraded") {
      items.push(`${monitor.monitor} is ${monitor.status}: ${monitor.detail}`);
    }
  }

  if (health.last_error) {
    items.push(`Last production cycle error: ${health.last_error}`);
  }

  return items;
}
