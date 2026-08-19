import Link from "next/link";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { formatTimestamp } from "@/lib/format";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

export default async function WhyPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const result = await safeJulieCall(() => julie.stateWhy(topic));

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const data = result.data;
  const isConflict =
    data.current_state != null &&
    data.current_state.content.trim().toLowerCase() !== data.house_status_value.trim().toLowerCase();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/dashboard/game-state" className="text-xs text-accent-strong hover:underline">
          ← Back to Game State
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text-primary">
          Why does Julie think {topic.replace(/_/g, " ").toLowerCase()} is what it is?
        </h1>
      </div>

      <Card title="Current State">
        <div className="text-2xl font-semibold text-text-primary">
          {data.current_state?.content || data.house_status_value || "Not taught"}
        </div>
        {data.current_state && (
          <p className="mt-2 text-sm text-text-secondary">
            Source: Moderator-taught STATE ·{" "}
            <Link href={`/dashboard/knowledge/${data.current_state.id}`} className="text-accent-strong hover:underline">
              Knowledge #{data.current_state.id}
            </Link>{" "}
            · taught {formatTimestamp(data.current_state.created_at)}
          </p>
        )}
        {!data.current_state && (
          <p className="mt-2 text-sm text-text-muted">
            No moderator has taught a STATE for this topic -- this value comes only from
            automated sources (House Status).
          </p>
        )}
      </Card>

      {isConflict && (
        <Card title="⚠️ Conflict" className="border-status-attention/40">
          <p className="text-sm text-text-secondary">
            The taught STATE (<strong>{data.current_state?.content}</strong>) and the live
            House Status value (<strong>{data.house_status_value || "(empty)"}</strong>) disagree.
          </p>
        </Card>
      )}

      <Card title="History" subtitle="Every STATE taught for this topic, oldest first">
        {data.history.length === 0 ? (
          <EmptyState title="No history" hint="Nothing has been taught for this topic yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <KnowledgeTypeBadge type={item.type} />
                    <span className={`text-sm ${item.active ? "text-text-primary" : "text-text-muted line-through"}`}>
                      {item.content}
                    </span>
                  </div>
                  {item.note && <p className="mt-0.5 text-xs text-text-muted">Reason: {item.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Related Facts" subtitle="Best-effort keyword match -- not exhaustive">
        {data.related_facts.length === 0 ? (
          <EmptyState title="No related facts found" />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.related_facts.map((item) => (
              <li key={item.id} className="text-sm text-text-secondary">
                📌 {item.content}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
