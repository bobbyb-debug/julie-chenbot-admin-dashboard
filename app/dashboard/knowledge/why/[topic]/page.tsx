import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { OfficialVsLiveFeed } from "@/components/OfficialVsLiveFeed";
import { Timestamp } from "@/components/Timestamp";
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
        <Link href="/dashboard/game-state" className="inline-flex items-center gap-1 text-xs text-accent-strong hover:underline">
          <ArrowLeft size={12} aria-hidden /> Back to Game State
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
            · taught <Timestamp value={data.current_state.created_at} />
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
        <Card
          title="Live Feed Differs From Official State"
          subtitle="Informational only -- the live feed never overrides an admin-confirmed value."
          className="border-status-attention/40"
        >
          <OfficialVsLiveFeed
            officialValue={data.current_state?.content || "Not confirmed yet"}
            liveFeedValue={data.house_status_value || "No observation"}
          />
        </Card>
      )}

      <Card title="History" subtitle="Every STATE taught for this topic, oldest first">
        {data.history.length === 0 ? (
          <EmptyState title="No history" hint="Nothing has been taught for this topic yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <KnowledgeTypeBadge type={item.type} />
                    <span className={`text-sm ${item.active ? "text-text-primary" : "text-text-muted line-through"}`}>
                      {item.content}
                    </span>
                  </div>
                  {item.note && <p className="mt-0.5 text-xs text-text-muted">Reason: {item.note}</p>}
                </div>
                <Timestamp value={item.created_at} className="shrink-0 text-xs text-text-muted" />
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
              <li key={item.id} className="flex items-start gap-1.5 text-sm text-text-secondary">
                <BookOpen size={13} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
                <span className="min-w-0">{item.content}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
