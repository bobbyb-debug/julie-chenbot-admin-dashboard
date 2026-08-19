import Link from "next/link";
import { Card } from "@/components/Card";
import { JulieOfflineState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTimestamp } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

const TOPICS: { topic: string; label: string }[] = [
  { topic: "HOH", label: "Head of Household" },
  { topic: "NOMINEES", label: "Nominees" },
  { topic: "VETO_WINNER", label: "Power of Veto" },
  { topic: "HAVE_NOTS", label: "Have-Nots" },
];

export default async function GameStatePage() {
  const result = await safeJulieCall(async () => {
    const [gameState, conflicts] = await Promise.all([julie.gameState(), julie.conflicts()]);
    return { gameState, conflicts };
  });

  if (!result.ok) {
    return <JulieOfflineState detail={result.offline ? result.message : result.message} />;
  }

  const { gameState, conflicts } = result.data;
  const house = gameState.house_status;
  const competition = gameState.competition;

  const values: Record<string, string> = {
    HOH: house.hoh,
    NOMINEES: house.nominees.join(", "),
    VETO_WINNER: house.veto_holder,
    HAVE_NOTS: house.have_nots.join(", "),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Game State</h1>
          <p className="text-sm text-text-muted">
            As of {formatTimestamp(house.timestamp)} · House Status monitor
          </p>
        </div>
        <Link
          href="/dashboard/knowledge/teach?mode=state"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Update State
        </Link>
      </div>

      {conflicts.conflicts.length > 0 && (
        <Card title="⚠️ Conflicts Detected" className="border-status-attention/40">
          <ul className="flex flex-col gap-3">
            {conflicts.conflicts.map((conflict) => (
              <li key={conflict.topic} className="text-sm">
                <span className="font-medium text-status-attention">{conflict.topic}</span>
                <span className="text-text-secondary"> — {conflict.reason}</span>
                <div className="mt-1 flex gap-4 text-xs text-text-muted">
                  <span>House Status: {conflict.house_status_value || "(empty)"}</span>
                  <span>Taught: {conflict.taught_value || "(none)"}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOPICS.map(({ topic, label }) => (
          <Card key={topic}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-text-secondary">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-text-primary">
                  {values[topic] || "—"}
                </div>
                {topic === "VETO_WINNER" && house.veto_holder && (
                  <div className="mt-1 text-xs text-text-muted">
                    {house.veto_used ? "Used" : "Not used"}
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/knowledge/why/${topic}`}
                className="shrink-0 rounded-lg border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                Why?
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Competition">
        <div className="flex flex-wrap items-center gap-6">
          <Field label="Type" value={competition.competition} />
          <Field
            label="Status"
            value={competition.active ? "In progress" : "Not active"}
            badge={competition.active ? <StatusBadge status="attention" label="Active" /> : undefined}
          />
          <Field label="Winner" value={competition.winner || "—"} />
          <Field label="Started" value={formatTimestamp(competition.started_at)} />
          <Field label="Ended" value={formatTimestamp(competition.ended_at)} />
        </div>
      </Card>

      <Card title="Live Feeds">
        <Field label="Status" value={house.feeds || "unknown"} />
      </Card>
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="mt-0.5 flex items-center gap-2 text-sm text-text-primary">
        {value}
        {badge}
      </div>
    </div>
  );
}
