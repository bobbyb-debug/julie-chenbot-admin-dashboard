import Link from "next/link";
import { AlertTriangle, History, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { IconTitle } from "@/components/IconTitle";
import { JulieOfflineState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTimestamp } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

export default async function GameStatePage() {
  const result = await safeJulieCall(async () => {
    const [gameState, conflicts, nomineeHistory, vetoHistory] = await Promise.all([
      julie.gameState(),
      julie.conflicts(),
      julie.stateWhy("NOMINEES"),
      julie.stateWhy("VETO_WINNER"),
    ]);
    return { gameState, conflicts, nomineeHistory, vetoHistory };
  });

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const { gameState, conflicts, nomineeHistory, vetoHistory } = result.data;
  const house = gameState.house_status;
  const competition = gameState.competition;

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
        <Card
          title={<IconTitle icon={AlertTriangle}>Conflicts Detected</IconTitle>}
          className="border-status-attention/40"
        >
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
        <Card>
          <FieldHeader label="Head of Household" topic="HOH" />
          <div className="mt-1 text-2xl font-semibold text-text-primary">{house.hoh || "—"}</div>
        </Card>

        <Card>
          <FieldHeader label="Have-Nots" topic="HAVE_NOTS" />
          <div className="mt-1 text-2xl font-semibold text-text-primary">
            {house.have_nots.length ? house.have_nots.join(", ") : "—"}
          </div>
        </Card>
      </div>

      <Card>
        <FieldHeader label="Nominees" topic="NOMINEES" />
        <div className="mt-1 text-2xl font-semibold text-text-primary">
          {house.nominees.length ? house.nominees.join(", ") : "—"}
        </div>
        <p className="mt-1 text-xs text-text-muted">Current nominees, per the live House Status source.</p>

        <NomineeTimeline history={nomineeHistory.history} label="Taught history for this topic" />
      </Card>

      <Card>
        <FieldHeader label="Power of Veto" topic="VETO_WINNER" />
        <div className="mt-1 text-2xl font-semibold text-text-primary">{house.veto_holder || "—"}</div>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 sm:grid-cols-4">
          <PovField label="Used" value={house.veto_holder ? (house.veto_used ? "Yes" : "No") : "—"} />
          <PovField label="Removed" value={null} />
          <PovField label="Replacement Nominee" value={null} />
        </dl>
        <p className="mt-3 text-xs text-text-muted">
          &ldquo;Removed&rdquo; and &ldquo;Replacement Nominee&rdquo; aren&apos;t exposed as structured
          fields by the production API today -- Julie&apos;s HouseStatus only tracks the veto holder
          and whether it was used. That detail, when known, lives in free-text Knowledge (often a
          Correction) rather than a dedicated field.{" "}
          <Link href="/dashboard/knowledge?type=correction" className="inline-flex items-center gap-1 text-accent-strong hover:underline">
            <Search size={12} aria-hidden /> Search Corrections
          </Link>
        </p>

        <NomineeTimeline history={vetoHistory.history} label="Taught history for POV winner" />
      </Card>

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

function FieldHeader({ label, topic }: { label: string; topic: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <Link
        href={`/dashboard/knowledge/why/${topic}`}
        className="shrink-0 rounded-lg border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        Why?
      </Link>
    </div>
  );
}

function PovField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className={`mt-0.5 text-sm ${value === null ? "italic text-text-muted" : "text-text-primary"}`}>
        {value ?? "Not available"}
      </div>
    </div>
  );
}

function NomineeTimeline({
  history,
  label,
}: {
  history: { id: number; content: string; created_at: string }[];
  label: string;
}) {
  if (history.length <= 1) return null;

  return (
    <div className="mt-4 border-t border-border-subtle pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <History size={13} aria-hidden /> {label}
      </p>
      <p className="mb-2 text-xs text-text-muted">
        Julie&apos;s API has no separate &ldquo;original nominees&rdquo; field -- this is the
        chronological record of every STATE taught for this topic, which is how an original
        nomination followed by a veto replacement actually shows up.
      </p>
      <ol className="flex flex-col gap-1.5">
        {history.map((item, i) => (
          <li key={item.id} className="flex items-baseline gap-2 text-sm">
            <span className="text-xs text-text-muted">{formatTimestamp(item.created_at)}</span>
            <span className={i === history.length - 1 ? "font-medium text-text-primary" : "text-text-muted line-through"}>
              {item.content}
            </span>
          </li>
        ))}
      </ol>
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
