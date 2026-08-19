// Mirrors the JSON shapes produced by the JulieChenBot admin API
// (admin_api/routes.py, in the separate JulieChenBot repo). Field
// names match exactly -- see docs/julie-api.md in this repo.

export type KnowledgeType = "fact" | "rule" | "correction" | "state";

export interface KnowledgeItem {
  id: number;
  type: KnowledgeType;
  content: string;
  author_id: number;
  created_at: string;
  updated_at: string;
  active: boolean;
  supersedes: number | null;
  topic: string | null;
  note: string | null;
}

export interface HouseStatusSnapshot {
  timestamp: string;
  hoh: string;
  nominees: string[];
  veto_holder: string;
  veto_used: boolean;
  have_nots: string[];
  feeds: string;
}

export interface CompetitionSnapshot {
  competition: string;
  active: boolean;
  winner: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GameStateResponse {
  house_status: HouseStatusSnapshot;
  competition: CompetitionSnapshot;
}

export interface MonitorResultView {
  monitor: string;
  status: "healthy" | "degraded" | "unhealthy" | "disabled";
  changed: boolean;
  detail: string;
  checked_at: string;
  duration_ms: number;
  event_count: number;
  metadata: Record<string, unknown>;
}

export interface EngineHealth {
  status: "healthy" | "degraded";
  running: boolean;
  started_at: string | null;
  uptime_seconds: number;
  uptime: string;
  tick_count: number;
  last_tick_at: string | null;
  monitor_count: number;
  healthy_monitors: number;
  pending_events: number;
  error_count: number;
  last_error: string | null;
  monitors: MonitorResultView[];
}

export interface EngineInfo {
  name: string;
  version: string;
  phase: string;
  build: string;
  started_at: string | null;
  uptime: string;
  watcher: { registered_monitors: number; healthy_monitors: number };
}

export interface HealthResponse {
  engine: EngineHealth;
  info: EngineInfo;
}

export interface ProductionEventView {
  source: string;
  event_type: string;
  title: string;
  detail: string;
  severity: "debug" | "info" | "notice" | "warning" | "important" | "critical";
  created_at: string;
  metadata: Record<string, unknown>;
  announced: boolean;
  delivered_to: string[];
}

export interface RecentEventEntry {
  event_type: string;
  source: string;
  title: string;
  detail: string;
  severity: ProductionEventView["severity"];
  created_at: string;
  delivered_to: string[];
}

export interface WatcherSnapshot {
  total_monitors: number;
  enabled_monitors: number;
  disabled_monitors: number;
  failed_monitors: { name: string; error: string }[];
  monitors: { name: string; enabled: boolean; last_status: string }[];
}

export interface SourcesResponse {
  rss: {
    last_guid: string;
    last_title: string;
    last_published: string;
    feed_state: string;
  };
  house_image: { url: string; last_hash: string };
  competition: CompetitionSnapshot;
  hamsterwatch: { archive_size: number; bootstrapping: boolean } | null;
  monitors: WatcherSnapshot;
}

export interface DiagnosticsResponse {
  health: EngineHealth;
  watcher: WatcherSnapshot;
  pending_events: ProductionEventView[];
  recent_warnings: RecentEventEntry[];
}

export interface ChannelInfo {
  channel: string;
  channel_id: number | null;
  configured: boolean;
}

export interface RoutingEntry {
  destinations: ChannelInfo[];
  escalates_to_production_log_on_warning: boolean;
}

export interface DiscordRoutingResponse {
  channels: Record<string, ChannelInfo>;
  routing: Record<string, RoutingEntry>;
}

export interface Conflict {
  topic: string;
  house_status_value: string;
  taught_value: string | null;
  reason: string;
}

export interface ConflictsResponse {
  conflicts: Conflict[];
}

export interface StateWhyResponse {
  topic: string;
  current_state: KnowledgeItem | null;
  house_status_value: string;
  history: KnowledgeItem[];
  related_facts: KnowledgeItem[];
}

export interface PlanLine {
  line_number: number;
  raw: string;
  type: KnowledgeType | null;
  content: string;
  topic: string | null;
  note: string | null;
}

export interface PlanInvalidLine {
  line_number: number;
  raw: string;
  error: string;
}

export interface PlanConflict {
  topic: string;
  current_value: string | null;
  new_value: string;
}

export interface PlanResponse {
  valid: PlanLine[];
  invalid: PlanInvalidLine[];
  conflicts: PlanConflict[];
}

export interface ApplyResponse {
  written: KnowledgeItem[];
  applied_topics?: string[];
}
