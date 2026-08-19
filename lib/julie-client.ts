import type {
  ApplyResponse,
  ConflictsResponse,
  DiagnosticsResponse,
  DiscordRoutingResponse,
  GameStateResponse,
  HealthResponse,
  KnowledgeItem,
  PlanResponse,
  ProductionEventView,
  RecentEventEntry,
  SourcesResponse,
  StateWhyResponse,
} from "./julie-types";

/** Thrown whenever Julie's admin API can't be reached at all (down,
 * unconfigured, network error, timeout) -- distinct from Julie
 * responding with an error, so callers can render "Julie is offline"
 * instead of a generic error. The dashboard itself must stay usable
 * either way -- see docs/architecture.md. */
export class JulieUnavailableError extends Error {}

/** Thrown when Julie responded, but rejected the request (4xx/5xx). */
export class JulieApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function config(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.JULIE_API_URL;
  const apiKey = process.env.JULIE_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export function isJulieConfigured(): boolean {
  return config() !== null;
}

async function callJulie<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = config();
  if (!cfg) {
    throw new JulieUnavailableError(
      "Julie's admin API is not configured (set JULIE_API_URL and JULIE_API_KEY).",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (error) {
    throw new JulieUnavailableError(
      `Could not reach Julie: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
      `Julie API error (HTTP ${response.status})`;
    throw new JulieApiError(message, response.status);
  }

  return data as T;
}

export interface CreateKnowledgeInput {
  type: string;
  content: string;
  author_id: number;
  supersedes?: number | null;
  topic?: string | null;
  note?: string | null;
}

export const julie = {
  health: () => callJulie<HealthResponse>("/api/v1/health"),
  gameState: () => callJulie<GameStateResponse>("/api/v1/game-state"),
  conflicts: () => callJulie<ConflictsResponse>("/api/v1/conflicts"),

  listKnowledge: (query: Record<string, string> = {}) =>
    callJulie<KnowledgeItem[]>(`/api/v1/knowledge?${new URLSearchParams(query)}`),
  getKnowledge: (id: number) => callJulie<KnowledgeItem>(`/api/v1/knowledge/${id}`),
  createKnowledge: (body: CreateKnowledgeInput) =>
    callJulie<KnowledgeItem>("/api/v1/knowledge", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  forgetKnowledge: (id: number) =>
    callJulie<{ id: number; forgotten: boolean }>(`/api/v1/knowledge/${id}/forget`, {
      method: "POST",
    }),
  stateWhy: (topic: string) =>
    callJulie<StateWhyResponse>(`/api/v1/state/${encodeURIComponent(topic)}/why`),

  batchPlan: (text: string) =>
    callJulie<PlanResponse>("/api/v1/batch/plan", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  batchApply: (text: string, authorId: number, lineNumbers?: number[]) =>
    callJulie<ApplyResponse>("/api/v1/batch/apply", {
      method: "POST",
      body: JSON.stringify({ text, author_id: authorId, line_numbers: lineNumbers }),
    }),
  statePlan: (text: string, reason?: string) =>
    callJulie<PlanResponse>("/api/v1/state/plan", {
      method: "POST",
      body: JSON.stringify({ text, reason }),
    }),
  stateApply: (text: string, authorId: number, reason?: string, lineNumbers?: number[]) =>
    callJulie<ApplyResponse>("/api/v1/state/apply", {
      method: "POST",
      body: JSON.stringify({ text, author_id: authorId, reason, line_numbers: lineNumbers }),
    }),

  sources: () => callJulie<SourcesResponse>("/api/v1/sources"),
  events: (limit = 50) => callJulie<RecentEventEntry[]>(`/api/v1/events?limit=${limit}`),
  pendingEvents: () => callJulie<ProductionEventView[]>("/api/v1/events/pending"),
  diagnostics: () => callJulie<DiagnosticsResponse>("/api/v1/diagnostics"),
  discordRouting: () => callJulie<DiscordRoutingResponse>("/api/v1/discord/routing"),
};
